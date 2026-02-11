import { getUserBrands } from "@/actions/objects";
import { ObjectForm } from "@/components/object-form";

export default async function NewObjectPage() {
  const brands = await getUserBrands();

  return (
    <div>
      <h1 className="text-2xl font-medium tracking-tight mb-8">
        Add new object
      </h1>
      <ObjectForm brands={brands} />
    </div>
  );
}
