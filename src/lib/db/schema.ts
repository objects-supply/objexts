import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Users ───────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // matches auth.users.id
  username: text("username").unique().notNull(),
  displayName: text("display_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("user"), // "user" | "admin"
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  inventory: many(inventory),
  userProducts: many(userProducts),
}));

// ─── Brands (global) ─────────────────────────────────────────
export const brands = pgTable(
  "brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    url: text("url"),
    imageUrl: text("image_url"),
  },
  (table) => [
    uniqueIndex("brands_slug_unique_idx").on(table.slug),
  ]
);

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
  userProducts: many(userProducts),
  inventory: many(inventory),
}));

// ─── Products (curated catalog) ──────────────────────────────
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    productUrl: text("product_url"),
    imageUrl: text("image_url"),
    category: text("category"),
    description: text("description"),
    defaultPrice: numeric("default_price", { precision: 10, scale: 2 }),
    customFields: jsonb("custom_fields").$type<Record<string, string>>(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow(),
  },
  (table) => [
    index("idx_products_brand_id").on(table.brandId),
  ]
);

export const productsRelations = relations(products, ({ one, many }) => ({
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  inventory: many(inventory),
}));

// ─── User Products (user-submitted, pending review) ──────────
export const userProducts = pgTable(
  "user_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    productUrl: text("product_url"),
    imageUrl: text("image_url"),
    category: text("category"),
    description: text("description"),
    defaultPrice: numeric("default_price", { precision: 10, scale: 2 }),
    customFields: jsonb("custom_fields").$type<Record<string, string>>(),
    status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected"
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow(),
  },
  (table) => [
    index("idx_user_products_user_id").on(table.userId),
    index("idx_user_products_status").on(table.status),
  ]
);

export const userProductsRelations = relations(userProducts, ({ one, many }) => ({
  user: one(users, {
    fields: [userProducts.userId],
    references: [users.id],
  }),
  brand: one(brands, {
    fields: [userProducts.brandId],
    references: [brands.id],
  }),
  inventory: many(inventory),
}));

// ─── Inventory (user's collection) ───────────────────────────
export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    userProductId: uuid("user_product_id").references(() => userProducts.id, { onDelete: "set null" }),
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    sourceUrl: text("source_url"),
    imageUrl: text("image_url"),
    description: text("description"),
    acquisitionType: text("acquisition_type").notNull().default("Purchased"),
    reason: text("reason"),
    quantity: integer("quantity").default(1),
    price: numeric("price", { precision: 10, scale: 2 }),
    currency: text("currency").default("USD"),
    category: text("category"),
    customFields: jsonb("custom_fields").$type<Record<string, string>>(),
    isPublic: boolean("is_public").default(true).notNull(),
    acquiredAt: timestamp("acquired_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_inventory_product_id").on(table.productId),
    index("idx_inventory_user_product_id").on(table.userProductId),
    index("idx_inventory_brand_id").on(table.brandId),
    index("idx_inventory_user_id").on(table.userId),
  ]
);

export const inventoryRelations = relations(inventory, ({ one, many }) => ({
  profile: one(users, {
    fields: [inventory.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
  userProduct: one(userProducts, {
    fields: [inventory.userProductId],
    references: [userProducts.id],
  }),
  brand: one(brands, {
    fields: [inventory.brandId],
    references: [brands.id],
  }),
}));

// ─── Types ───────────────────────────────────────────────────
export type UserRole = "user" | "admin";
export type UserProductStatus = "pending" | "approved" | "rejected";
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
// Legacy alias
export type Profile = User;
export type NewProfile = NewUser;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type UserProduct = typeof userProducts.$inferSelect;
export type NewUserProduct = typeof userProducts.$inferInsert;
export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
// Legacy type aliases
export type ObjectItem = Inventory;
export type NewObjectItem = NewInventory;
export type OfferedObject = Product;
export type NewOfferedObject = NewProduct;
