import express from "express";
import {
  TrainModel,
  GenerateImage,
  GenerateImagesFromPack,
} from "common1/types";
import { prismaClient } from "db";

const PORT = process.env.PORT || 3000;
const fal_key = process.env.fal_key;
const app = express();
const UserId = "123";

app.use(express.json());

app.post("/ai/training", async (req, res) => {
  const parsedBody = TrainModel.safeParse(req.body);
  if (!parsedBody.success) {
    res
      .status(400)
      .json({ message: "Invalid request body", error: parsedBody.error });
    return;
  }

  const data = await prismaClient.model.create({
    data: {
      name: parsedBody.data.name,
      type: parsedBody.data.type,
      age: parsedBody.data.age,
      ethinicity: parsedBody.data.ethinicity,
      eyeColor: parsedBody.data.eyeColor,
      bald: parsedBody.data.bald,
      userId: UserId,
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

  const data = await prismaClient.outputImages.create({
    data: {
      prompt: parsedBody.data.prompt,
      modelId: parsedBody.data.modelId,
      userId: UserId,
      imageUrl: "",
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
