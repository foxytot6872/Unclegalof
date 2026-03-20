import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { validate } from "../middleware/validate.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireInventory } from "../middleware/authorize.middleware.js";
import { writeRateLimiter } from "../middleware/rateLimit.middleware.js";

const router = Router();

// NOTE: Inventory models (InventoryLot, InventoryMovement) don't exist in current schema
// These routes are placeholder and will need schema updates to work properly

// Frontend format - uses type (string name) instead of deskItemId
const frontendStockInSchema = z.object({
  type: z.string().min(1), // Product type name (e.g., "โต๊ะลอฟ 70")
  qty: z.number().int().positive(),
  note: z.string().optional().default(""),
});

const batchLotsSchema = z.object({
  note: z.string().optional().default(""),
  items: z.array(
    z.object({
      deskItemId: z.string().uuid(),
      qty: z.number().int().positive(),
      costPerUnit: z.number().nonnegative(),
    })
  ).min(1),
});

const paramsIdSchema = z.object({
  id: z.string().uuid(),
});

const inventoryProductSchema = z.object({
  name: z.string().min(1).max(200),
  onsitePrice: z.number().int().nonnegative(),
  deliveryPrice: z.number().int().nonnegative(),
});

// GET /api/inventory/products - Get all products available for inventory management
router.get(
  "/products",
  authenticate,
  requireInventory,
  async (req, res, next) => {
    try {
      const items = await prisma.deskItem.findMany({
        orderBy: { name: "asc" },
      });

      res.json({ items });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/inventory/products - Create a new product
router.post(
  "/products",
  authenticate,
  requireInventory,
  writeRateLimiter,
  validate(inventoryProductSchema),
  async (req, res, next) => {
    try {
      const payload = req.body;
      const existing = await prisma.deskItem.findUnique({
        where: { name: payload.name },
      });

      if (existing) {
        return res.status(409).json({ error: "Product with this name already exists" });
      }

      const item = await prisma.deskItem.create({
        data: {
          name: payload.name,
          onsitePrice: payload.onsitePrice,
          deliveryPrice: payload.deliveryPrice,
        },
      });

      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/inventory/products/:id - Update a product
router.patch(
  "/products/:id",
  authenticate,
  requireInventory,
  writeRateLimiter,
  validate(paramsIdSchema, "params"),
  validate(inventoryProductSchema.partial()),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const payload = req.body;

      const existing = await prisma.deskItem.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({ error: "Product not found" });
      }

      const updated = await prisma.deskItem.update({
        where: { id },
        data: payload,
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/inventory/products/:id - Delete a product
router.delete(
  "/products/:id",
  authenticate,
  requireInventory,
  writeRateLimiter,
  validate(paramsIdSchema, "params"),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const existing = await prisma.deskItem.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({ error: "Product not found" });
      }

      await prisma.deskItem.delete({
        where: { id },
      });

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/inventory/summary - Get inventory summary
// TODO: Implement when inventory models are added to schema
router.get(
  "/summary",
  authenticate,
  requireInventory,
  async (req, res, next) => {
    try {
      const deskItems = await prisma.deskItem.findMany({
        orderBy: { name: "asc" },
      });
      
      // Transform to frontend format
      const summary = deskItems.map(item => ({
        type: item.name,
        qty: 0, // TODO: Calculate from inventory when models are added
      }));
      
      res.json({
        summary,
        movements: [], // TODO: Get movements when models are added
        message: "Inventory models not yet implemented in schema - showing desk items only",
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/inventory/lots - Get inventory lots
// TODO: Implement when inventory models are added to schema
router.get(
  "/lots",
  authenticate,
  requireInventory,
  async (req, res, next) => {
    try {
      // Placeholder - inventory models don't exist yet
      res.json({
        items: [],
        message: "Inventory models not yet implemented in schema",
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/inventory/movements/stock-in - Add stock
// TODO: Implement when inventory models are added to schema
router.post(
  "/movements/stock-in",
  authenticate,
  requireInventory,
  writeRateLimiter,
  validate(frontendStockInSchema),
  async (req, res, next) => {
    try {
      const payload = req.body;
      
      // Find desk item by name (type)
      const deskItem = await prisma.deskItem.findFirst({
        where: {
          name: payload.type,
        },
      });
      
      if (!deskItem) {
        return res.status(404).json({ error: `Desk item "${payload.type}" not found. Please create it first in catalog.` });
      }
      
      // TODO: Create inventory movement when models are added
      return res.status(501).json({
        error: "Inventory models not yet implemented in schema",
        message: "Please add InventoryLot and InventoryMovement models to schema.prisma",
        deskItemId: deskItem.id, // Return deskItemId for reference
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/inventory/lots/batch - Create batch of inventory lots
// TODO: Implement when inventory models are added to schema
router.post(
  "/lots/batch",
  authenticate,
  requireInventory,
  writeRateLimiter,
  validate(batchLotsSchema),
  async (req, res, next) => {
    try {
      const payload = req.body;
      
      // Verify all deskItems exist
      for (const item of payload.items) {
        const deskItem = await prisma.deskItem.findUnique({
          where: { id: item.deskItemId },
        });
        
        if (!deskItem) {
          return res.status(404).json({ error: `Desk item ${item.deskItemId} not found` });
        }
      }
      
      // TODO: Create inventory lots when models are added
      return res.status(501).json({
        error: "Inventory models not yet implemented in schema",
        message: "Please add InventoryLot and InventoryMovement models to schema.prisma",
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/inventory/lots/:id - Delete inventory lot
// TODO: Implement when inventory models are added to schema
router.delete(
  "/lots/:id",
  authenticate,
  requireInventory,
  writeRateLimiter,
  validate(paramsIdSchema, "params"),
  async (req, res, next) => {
    try {
      // TODO: Delete inventory lot when models are added
      return res.status(501).json({
        error: "Inventory models not yet implemented in schema",
        message: "Please add InventoryLot and InventoryMovement models to schema.prisma",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
