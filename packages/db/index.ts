import { PrismaClient } from "@prisma/client";
//convert this to a  singleton for nextjs
// const prismaClientSingleton = () => {
//   return new PrismaClient();
// };

// type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

// export const prisma: PrismaClientSingleton = prismaClientSingleton();
export const prismaClient = new PrismaClient();
