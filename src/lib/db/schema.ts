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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Profiles ────────────────────────────────────────────────
export const profiles = pgTable("profiles", {
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

export const profilesRelations = relations(profiles, ({ many }) => ({
  objects: many(objects),
  brands: many(brands),
}));

// ─── Brands ──────────────────────────────────────────────────
export const brands = pgTable(
  "brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    url: text("url"),
    imageUrl: text("image_url"),
  },
  (table) => [
    uniqueIndex("brands_user_slug_idx").on(table.userId, table.slug),
  ]
);

export const brandsRelations = relations(brands, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [brands.userId],
    references: [profiles.id],
  }),
  objects: many(objects),
}));

// ─── Objects ─────────────────────────────────────────────────
export const objects = pgTable("objects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  brandId: uuid("brand_id").references(() => brands.id, {
    onDelete: "set null",
  }),
  brandName: text("brand_name"), // denormalized for display
  brandSlug: text("brand_slug"), // denormalized for URL
  productUrl: text("product_url"),
  imageUrl: text("image_url"),
  coverImageId: uuid("cover_image_id"),
  description: text("description"),
  acquisitionType: text("acquisition_type").notNull().default("Purchased"), // "Purchased" | "Gifted"
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
});

export const objectsRelations = relations(objects, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [objects.userId],
    references: [profiles.id],
  }),
  brand: one(brands, {
    fields: [objects.brandId],
    references: [brands.id],
  }),
  images: many(objectImages, {
    relationName: "object_images",
  }),
  coverImage: one(objectImages, {
    fields: [objects.coverImageId],
    references: [objectImages.id],
    relationName: "object_cover_image",
  }),
}));

// ─── Object Images ───────────────────────────────────────────
export const objectImages = pgTable("object_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  objectId: uuid("object_id")
    .notNull()
    .references(() => objects.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  url: text("url").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const objectImagesRelations = relations(objectImages, ({ one }) => ({
  object: one(objects, {
    fields: [objectImages.objectId],
    references: [objects.id],
    relationName: "object_images",
  }),
}));

// ─── Offered Objects (catalog) ───────────────────────────────
export const offeredObjects = pgTable("offered_objects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  brandName: text("brand_name"),
  productUrl: text("product_url"),
  category: text("category"),
  description: text("description"),
  defaultPrice: numeric("default_price", { precision: 10, scale: 2 }),
  customFields: jsonb("custom_fields").$type<Record<string, string>>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── Types ───────────────────────────────────────────────────
export type UserRole = "user" | "admin";
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type ObjectItem = typeof objects.$inferSelect;
export type NewObjectItem = typeof objects.$inferInsert;
export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
export type ObjectImage = typeof objectImages.$inferSelect;
export type NewObjectImage = typeof objectImages.$inferInsert;
export type OfferedObject = typeof offeredObjects.$inferSelect;
export type NewOfferedObject = typeof offeredObjects.$inferInsert;
