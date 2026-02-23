import { redirect } from "next/navigation";
import { getAuthProfile } from "@/lib/auth";
import { ProductForm } from "@/components/product-form";

export default async function NewProductPage() {
    const profile = await getAuthProfile();

    if (!profile) {
        redirect("/login");
    }

    if (profile.role !== "admin") {
        redirect("/dashboard");
    }

    return (
        <div>
            <h1 className="text-2xl font-semibold mb-6">Create Product</h1>
            <ProductForm />
        </div>
    );
}
