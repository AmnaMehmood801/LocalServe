import { useEffect, useState, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "../lib/toast";
import { z } from "zod";

import { useAreas } from "../app/AreaContext";
import { useAuth } from "../app/AuthContext";
import {
  fetchSamundriCityId,
  isUuid,
  SAMUNDRI_CITY_QUERY_KEY,
} from "../lib/catalog";
import { supabase } from "../lib/supabase";

const listingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(4, "Enter a title with at least 4 characters.")
    .max(100),
  description: z
    .string()
    .trim()
    .min(20, "Add a little more detail to the description.")
    .max(4000),
  category_id: z.string().uuid("Choose a category."),
  area_id: z.string().uuid("Choose a Samundri area."),
  pricing_type: z.enum(["hourly", "fixed"]),
  price_amount: z.coerce.number().positive("Price must be greater than zero."),
  duration_minutes: z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined
        ? null
        : Number(value),
    z.number().int().positive().nullable(),
  ),
  availability_note: z.string().trim().max(300).optional(),
});

type ListingFormValues = z.infer<typeof listingSchema>;
type CategoryOption = { id: string; name: string };
type ExistingListing = ListingFormValues & {
  id: string;
  provider_id: string;
  city_id: string;
  cover_image_path: string | null;
};

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const maxImageBytes = 2 * 1024 * 1024;

export function ProviderListingFormPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { user } = useAuth();
  const {
    areas,
    selectedAreaId,
    loading: areasLoading,
    error: areasError,
  } = useAreas();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cityQuery = useQuery({
    queryKey: SAMUNDRI_CITY_QUERY_KEY,
    queryFn: fetchSamundriCityId,
  });
  const categoriesQuery = useQuery({
    queryKey: ["catalog", "active-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as CategoryOption[];
    },
  });
  const listingQuery = useQuery({
    queryKey: ["provider", "listing", id, user?.id],
    enabled: Boolean(isEditing && id && user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, provider_id, city_id, title, description, category_id, area_id, pricing_type, price_amount, duration_minutes, availability_note, cover_image_path",
        )
        .eq("id", id!)
        .eq("provider_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ExistingListing | null;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: "",
      description: "",
      category_id: "",
      area_id: selectedAreaId,
      pricing_type: "fixed",
      price_amount: 0,
      duration_minutes: null,
      availability_note: "",
    },
  });

  useEffect(() => {
    if (listingQuery.data) {
      reset({
        title: listingQuery.data.title,
        description: listingQuery.data.description,
        category_id: listingQuery.data.category_id,
        area_id: listingQuery.data.area_id,
        pricing_type: listingQuery.data.pricing_type,
        price_amount: Number(listingQuery.data.price_amount),
        duration_minutes: listingQuery.data.duration_minutes,
        availability_note: listingQuery.data.availability_note ?? "",
      });
    } else if (!isEditing && selectedAreaId) {
      reset((current) => ({ ...current, area_id: selectedAreaId }));
    }
  }, [isEditing, listingQuery.data, reset, selectedAreaId]);

  function onCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setFormError(null);
    if (!file) {
      setCoverFile(null);
      return;
    }
    if (!imageTypes.has(file.type)) {
      setFormError("Choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > maxImageBytes) {
      setFormError("The image must be 2 MB or smaller.");
      event.target.value = "";
      return;
    }
    setCoverFile(file);
    setRemoveCover(false);
  }

  async function onSubmit(values: ListingFormValues) {
    const cityId = cityQuery.data;
    if (!user || !isUuid(cityId)) return;
    setSubmitting(true);
    setFormError(null);
    const listingId = listingQuery.data?.id ?? crypto.randomUUID();
    const previousCover = listingQuery.data?.cover_image_path ?? null;
    let coverPath = removeCover ? null : previousCover;
    let uploadedPath: string | null = null;

    if (coverFile) {
      const extension = imageExtensions[coverFile.type];
      const objectPath = `${user.id}/${listingId}/${crypto.randomUUID()}.${extension}`;
      const { data: upload, error: uploadError } = await supabase.storage
        .from("listing-covers")
        .upload(objectPath, coverFile, {
          contentType: coverFile.type,
          upsert: false,
        });
      if (uploadError) {
        setSubmitting(false);
        setFormError(
          "Cover upload is unavailable. Check that the listing-covers bucket and provider storage policies are configured.",
        );
        return;
      }
      coverPath = upload.path;
      uploadedPath = upload.path;
    }

    const record = {
      provider_id: user.id,
      city_id: cityId,
      area_id: values.area_id,
      category_id: values.category_id,
      title: values.title,
      description: values.description,
      pricing_type: values.pricing_type,
      price_amount: values.price_amount,
      currency: "PKR",
      duration_minutes: values.duration_minutes,
      availability_note: values.availability_note || null,
      cover_image_path: coverPath,
    };

    const result = isEditing
      ? await supabase
          .from("listings")
          .update(record)
          .eq("id", listingId)
          .eq("provider_id", user.id)
          .select("id")
          .maybeSingle()
      : await supabase
          .from("listings")
          .insert({ id: listingId, ...record })
          .select("id")
          .maybeSingle();

    if (result.error || !result.data) {
      if (uploadedPath)
        await supabase.storage.from("listing-covers").remove([uploadedPath]);
      setSubmitting(false);
      setFormError(
        "Could not save this listing. Check your provider role and try again.",
      );
      return;
    }

    if (removeCover && previousCover) {
      await supabase.storage.from("listing-covers").remove([previousCover]);
    }

    await queryClient.invalidateQueries({
      queryKey: ["provider", "listings", user.id],
    });
    await queryClient.invalidateQueries({ queryKey: ["listings"] });
    toast.success(isEditing ? "Listing updated." : "Listing created.");
    navigate("/provider/listings", { replace: true });
  }

  if (isEditing && listingQuery.isPending) {
    return (
      <div className="shell-container py-12" role="status">
        Loading listing...
      </div>
    );
  }
  if (isEditing && (listingQuery.isError || !listingQuery.data)) {
    return (
      <section className="shell-container py-12" role="alert">
        <h1 className="text-2xl font-semibold">Listing unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">
          This listing could not be loaded for your account.
        </p>
        <Link
          to="/provider/listings"
          className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-ink/20 bg-white px-4"
        >
          Back to my listings
        </Link>
      </section>
    );
  }

  const existingCover = listingQuery.data?.cover_image_path;
  const priceAmount = watch("price_amount");

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-8 md:py-10">
      <header className="mb-6 border-b border-cream-100 pb-5">
        <p className="text-xs font-semibold uppercase text-slate-600">
          Provider workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold">
          {isEditing ? "Edit listing" : "Create listing"}
        </h1>
      </header>

      {(cityQuery.isError || categoriesQuery.isError || areasError) && (
        <p
          className="mb-5 rounded-xl border border-rose-600/20 bg-white p-4 text-sm text-slate-600"
          role="alert"
        >
          {areasError ?? "Listing options could not be loaded. Try again."}
        </p>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 rounded-xl border border-cream-100 bg-white p-5 shadow-sm md:p-7"
        noValidate
      >
        <div>
          <label
            htmlFor="listing-title"
            className="mb-1 block text-sm font-medium"
          >
            Title
          </label>
          <input
            id="listing-title"
            {...register("title")}
            className="min-h-11 w-full rounded-lg border border-slate-400/50 px-3 outline-none focus:ring-2 focus:ring-teal-600"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-rose-600">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="listing-description"
            className="mb-1 block text-sm font-medium"
          >
            Description
          </label>
          <textarea
            id="listing-description"
            rows={5}
            {...register("description")}
            className="w-full rounded-lg border border-slate-400/50 px-3 py-2 outline-none focus:ring-2 focus:ring-teal-600"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-rose-600">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="listing-category"
              className="mb-1 block text-sm font-medium"
            >
              Category
            </label>
            <select
              id="listing-category"
              {...register("category_id")}
              className="min-h-11 w-full rounded-lg border border-slate-400/50 bg-white px-3 outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="">Select a category</option>
              {(categoriesQuery.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.category_id && (
              <p className="mt-1 text-sm text-rose-600">
                {errors.category_id.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="listing-area"
              className="mb-1 block text-sm font-medium"
            >
              Service area
            </label>
            <select
              id="listing-area"
              {...register("area_id")}
              disabled={areasLoading || areas.length === 0}
              className="min-h-11 w-full rounded-lg border border-slate-400/50 bg-white px-3 outline-none focus:ring-2 focus:ring-teal-600 disabled:opacity-60"
            >
              <option value="">Select an area</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            {errors.area_id && (
              <p className="mt-1 text-sm text-rose-600">
                {errors.area_id.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label
              htmlFor="listing-pricing"
              className="mb-1 block text-sm font-medium"
            >
              Pricing
            </label>
            <select
              id="listing-pricing"
              {...register("pricing_type")}
              className="min-h-11 w-full rounded-lg border border-slate-400/50 bg-white px-3 outline-none focus:ring-2 focus:ring-teal-600"
            >
              <option value="fixed">Fixed price</option>
              <option value="hourly">Per hour</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="listing-price"
              className="mb-1 block text-sm font-medium"
            >
              Price (Rs.)
            </label>
            <input
              id="listing-price"
              type="number"
              min="1"
              step="0.01"
              inputMode="decimal"
              {...register("price_amount")}
              value={priceAmount === 0 ? "" : priceAmount}
              placeholder="e.g. 1500"
              className="min-h-11 w-full rounded-lg border border-slate-400/50 px-3 outline-none focus:ring-2 focus:ring-teal-600"
            />
            {errors.price_amount && (
              <p className="mt-1 text-sm text-rose-600">
                {errors.price_amount.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="listing-duration"
              className="mb-1 block text-sm font-medium"
            >
              Duration (minutes, optional)
            </label>
            <input
              id="listing-duration"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              {...register("duration_minutes")}
              className="min-h-11 w-full rounded-lg border border-slate-400/50 px-3 outline-none focus:ring-2 focus:ring-teal-600"
            />
            {errors.duration_minutes && (
              <p className="mt-1 text-sm text-rose-600">
                Enter a positive number of minutes.
              </p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="listing-availability"
            className="mb-1 block text-sm font-medium"
          >
            Availability note (optional)
          </label>
          <input
            id="listing-availability"
            {...register("availability_note")}
            className="min-h-11 w-full rounded-lg border border-slate-400/50 px-3 outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>

        <div>
          <label
            htmlFor="listing-cover"
            className="mb-1 block text-sm font-medium"
          >
            Cover image (JPEG, PNG, or WebP; max 2 MB)
          </label>
          <input
            id="listing-cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onCoverChange}
            className="block min-h-11 w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-cream-100 file:px-4 file:font-medium"
          />
          {existingCover && !coverFile && (
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={removeCover}
                onChange={(event) => setRemoveCover(event.target.checked)}
              />{" "}
              Remove current cover
            </label>
          )}
          {coverFile && (
            <p className="mt-2 text-sm text-slate-600">
              Selected: {coverFile.name}
            </p>
          )}
        </div>

        {formError && (
          <p
            className="rounded-lg bg-rose-600/5 p-3 text-sm text-rose-600"
            role="alert"
          >
            {formError}
          </p>
        )}
        <div className="flex flex-wrap gap-3 border-t border-cream-100 pt-5">
          <button
            type="submit"
            disabled={
              submitting ||
              areasLoading ||
              categoriesQuery.isPending ||
              cityQuery.isPending
            }
            className="min-h-11 rounded-xl bg-teal-600 px-5 font-medium text-white hover:bg-teal-700 disabled:opacity-60"
          >
            {submitting
              ? "Saving..."
              : isEditing
                ? "Save changes"
                : "Create listing"}
          </button>
          <Link
            to="/provider/listings"
            className="inline-flex min-h-11 items-center rounded-xl border border-ink/20 px-5 text-sm font-medium hover:bg-cream-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
