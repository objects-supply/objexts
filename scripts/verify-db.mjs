import process from "node:process";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

async function assertQuery(name, queryFn, validateFn) {
  const result = await queryFn();
  const ok = validateFn(result);

  if (!ok) {
    throw new Error(`Assertion failed: ${name}`);
  }

  console.log(`PASS ${name}`);
}

async function main() {
  await assertQuery(
    "all required tables exist",
    () => sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ('profiles', 'brands', 'objects', 'object_images', 'offered_objects')
    `,
    (rows) => rows.length === 5,
  );

  await assertQuery(
    "row-level security is enabled on all required tables",
    () => sql`
      select c.relname as table_name
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in ('profiles', 'brands', 'objects', 'object_images', 'offered_objects')
        and c.relrowsecurity = true
    `,
    (rows) => rows.length === 5,
  );

  await assertQuery(
    "objects public select policy exists",
    () => sql`
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = 'objects'
        and policyname = 'Public objects are viewable by everyone'
    `,
    (rows) => rows.length === 1,
  );

  await assertQuery(
    "offered_objects public select policy exists",
    () => sql`
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = 'offered_objects'
        and policyname = 'Offered objects are viewable by everyone'
    `,
    (rows) => rows.length === 1,
  );

  await assertQuery(
    "profiles.role column exists",
    () => sql`
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'role'
    `,
    (rows) => rows.length === 1,
  );

  await assertQuery(
    "critical indexes exist",
    () => sql`
      select indexname
      from pg_indexes
      where schemaname = 'public'
        and indexname in (
          'idx_objects_user_id',
          'idx_objects_acquired_at',
          'idx_brands_user_id',
          'idx_object_images_object_id',
          'idx_offered_objects_name',
          'idx_offered_objects_brand_name',
          'idx_offered_objects_is_active',
          'idx_profiles_role'
        )
    `,
    (rows) => rows.length === 8,
  );

  console.log("Database verification checks completed.");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
