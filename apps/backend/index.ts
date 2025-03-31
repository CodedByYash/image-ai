import express from "express";
import {
  TrainModel,
  GenerateImage,
  GenerateImagesFromPack,
} from "common1/types";
import { prismaClient } from "db";
import { S3Client } from "bun";
import { FalAIModel } from "./models/FalAIModels";

const PORT = process.env.PORT || 3001;
const UserId = "123";
const falAiModel = new FalAIModel();
const app = express();

app.use(express.json());

app.get("/pre-signed-url", async (req, res) => {
  const key = `models/${Date.now()}_${Math.random()}.zip`;
  const url = S3Client.presign(key, {
    method: "PUT",
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    endpoint: process.env.ENDPOINT,
    bucket: process.env.BUCKET_NAME,
    expiresIn: 60 * 5,
    type: "application/zip",
  });
  res.json({ url, key });
});

app.post("/ai/training", async (req, res) => {
  const parsedBody = TrainModel.safeParse(req.body);
  const images = req.body.images;
  if (!parsedBody.success) {
    res
      .status(400)
      .json({ message: "Invalid request body", error: parsedBody.error });
    return;
  }

  const { request_id, response_url } = await falAiModel.trainModel(
    parsedBody.data.zipUrl,
    parsedBody.data.name
  );

  const data = await prismaClient.model.create({
    data: {
      name: parsedBody.data.name,
      type: parsedBody.data.type,
      age: parsedBody.data.age,
      ethinicity: parsedBody.data.ethinicity,
      eyeColor: parsedBody.data.eyeColor,
      bald: parsedBody.data.bald,
      userId: UserId,
      falAiRequestId: request_id,
      zipUrl: parsedBody.data.zipUrl,
    },
  });

  res
    .status(200)
    .json({ message: "Model created successfully", modelId: data.id });
});

app.post("/ai/generate", async (req, res) => {
  const parsedBody = GenerateImage.safeParse(req.body);
  if (!parsedBody.success) {
    res
      .status(400)
      .json({ message: "Invalid request body", error: parsedBody.error });
    return;
  }

  const model = await prismaClient.model.findUnique({
    where: {
      id: parsedBody.data.modelId,
    },
    select: {
      tensorPath: true,
    },
  });

  if (!model || !model.tensorPath) {
    res.status(400).json({ message: "Model not found" });
    return;
  }

  const { request_id, response_url } = await falAiModel.generateImage(
    parsedBody.data.prompt,
    model.tensorPath
  );
  const data = await prismaClient.outputImages.create({
    data: {
      prompt: parsedBody.data.prompt,
      modelId: parsedBody.data.modelId,
      userId: UserId,
      imageUrl: "",
      falAiRequestId: request_id,
    },
  });

  res
    .status(200)
    .json({ message: "Image generated successfully", imageId: data.id });
});

app.post("/pack/generate", async (req, res) => {
  const parsedBody = GenerateImagesFromPack.safeParse(req.body);
  if (!parsedBody.success) {
    res
      .status(400)
      .json({ message: "Invalid request body", error: parsedBody.error });
    return;
  }

  const prompts = await prismaClient.packPrompts.findMany({
    where: {
      packId: parsedBody.data.packId,
    },
  });

  const images = await prismaClient.outputImages.createManyAndReturn({
    data: prompts.map((prompt) => ({
      prompt: prompt.prompt,
      modelId: parsedBody.data.modelId,
      userId: UserId,
      imageUrl: "",
    })),
  });

  res.status(200).json({
    message: "Images generated successfully",
    images: images.map((image) => image.id),
  });
});

app.get("/pack/bulk", async (req, res) => {
  const packs = await prismaClient.packs.findMany({});

  res.status(200).json({
    message: "Packs fetched successfully",
    packs,
  });
});

app.get("/image/bulk", async (req, res) => {
  const ids = req.query.ids as string[];
  const limit = (req.query.limit as string) ?? "10";
  const offset = (req.query.offset as string) ?? "0";

  const imageData = await prismaClient.outputImages.findMany({
    where: {
      id: { in: ids },
      userId: UserId,
    },
    skip: parseInt(offset),
    take: parseInt(limit),
  });

  res.status(200).json({
    message: "Images fetched successfully",
    images: imageData,
  });
});

app.post("/fal-ai/webhook/train", async (req, res) => {
  console.log(req.body);

  const requestId = req.body.request_id;

  await prismaClient.model.updateMany({
    where: {
      falAiRequestId: requestId,
    },
    data: {
      trainingStatus: "Generated",
      tensorPath: req.body.tensor_path,
    },
  });
  res.status(200).json({ message: "Webhook received" });
});

app.post("/fal-ai/webhook/image", async (req, res) => {
  console.log(req.body);

  const requestId = req.body.request_id;

  await prismaClient.outputImages.updateMany({
    where: {
      falAiRequestId: requestId,
    },
    data: {
      status: "Generated",
      imageUrl: req.body.image_url,
    },
  });
  res.status(200).json({ message: "Webhook received" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
