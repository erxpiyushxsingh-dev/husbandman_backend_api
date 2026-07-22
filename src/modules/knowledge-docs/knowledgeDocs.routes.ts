import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../../common/middlewares/authenticate";
import { authorize } from "../../common/middlewares/authorize";
import { validateRequest } from "../../common/middlewares/validateRequest";
import { paginationQuerySchema } from "../../common/utils/pagination";
import { createBaseRepository } from "../../common/repository/baseRepository";
import { createCrudService } from "../../common/service/createCrudService";
import { createCrudController } from "../../common/controller/createCrudController";

export interface KnowledgeDoc {
  id: string;
  title: string;
  category: string;
  pages: number;
  status: "ready" | "processing";
}

const createSchema = z.object({
  title: z.string().trim().min(1).max(255),
  category: z.string().trim().max(100).optional(),
  pages: z.number().int().min(0).default(0),
  status: z.enum(["ready", "processing"]).default("processing"),
});
const updateSchema = createSchema.partial();
const idParamSchema = z.object({ id: z.string().uuid("Invalid id") });

const repository = createBaseRepository<KnowledgeDoc>("knowledge_docs");
const service = createCrudService<KnowledgeDoc>("Knowledge document", repository);
const controller = createCrudController<KnowledgeDoc>("Knowledge document", service);

export const knowledgeDocsRouter = Router();
knowledgeDocsRouter.use(authenticate);

knowledgeDocsRouter.get("/", validateRequest({ query: paginationQuerySchema }), controller.list);
knowledgeDocsRouter.get("/:id", validateRequest({ params: idParamSchema }), controller.getById);
knowledgeDocsRouter.post("/", validateRequest({ body: createSchema }), controller.create);
knowledgeDocsRouter.put("/:id", validateRequest({ params: idParamSchema, body: updateSchema }), controller.update);
knowledgeDocsRouter.delete("/:id", authorize("owner", "admin"), validateRequest({ params: idParamSchema }), controller.remove);
