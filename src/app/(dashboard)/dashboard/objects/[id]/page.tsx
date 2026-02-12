import { notFound } from "next/navigation";
import { getObjectById, getUserBrands } from "@/actions/objects";
import { ObjectForm } from "@/components/object-form";
import { ImageManager } from "@/components/image-manager";

export default async function EditObjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [object, brands] = await Promise.all([
    getObjectById(id),
    getUserBrands(),
  ]);

  if (!object) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-medium tracking-tight mb-8">
        Edit object
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <ObjectForm object={object} brands={brands} />
        <div>
          <h2 className="text-lg font-medium mb-4">Images</h2>
          <ImageManager
            objectId={object.id}
            images={object.images}
            coverImageId={object.coverImageId}
          />
        </div>
      </div>
    </div>
  );
}
