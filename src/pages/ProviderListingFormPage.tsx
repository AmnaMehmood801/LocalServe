import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
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
import { getAreaGroup } from "../lib/areaGroups";
import { supabase } from "../lib/supabase";
import { SelectMenu } from "../components/ui/SelectMenu";
import { BackButton } from "../components/ui/BackButton";
import { CoverCropper } from "../components/ui/CoverCropper";

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
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [isCoverCropperOpen, setIsCoverCropperOpen] = useState(false);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [coverFile]);

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
    control,
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
    setPendingCoverFile(file);
    setIsCoverCropperOpen(true);
    event.currentTarget.value = "";
  }

  function cancelCoverCrop() {
    setIsCoverCropperOpen(false);
    setPendingCoverFile(coverFile);
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  function finishCoverCrop(cropped: File) {
    setIsCoverCropperOpen(false);
    if (cropped.size > maxImageBytes) {
      setFormError("The image must be 2 MB or smaller.");
      setPendingCoverFile(coverFile);
      if (coverInputRef.current) coverInputRef.current.value = "";
      return;
    }

    setCoverFile(cropped);
    setPendingCoverFile(cropped);
    setRemoveCover(false);
    setFormError(null);
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
    const updatePayload = Object.fromEntries(
      Object.entries(record).filter(([key]) => key !== "provider_id"),
    ) as Omit<typeof record, "provider_id">;

    const result = isEditing
      ? await supabase
          .from("listings")
          .update(updatePayload)
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
      <BackButton
        fallback="/provider/listings"
        label="Back to my listings"
        className="mb-4"
      />
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
            Title{" "}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="listing-title"
            {...register("title")}
            className="h-10 w-full rounded-lg border border-slate-400/50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-600"
          />
          <p className="mt-1 text-xs text-slate-500">
            Short and clear, e.g. Home Wiring &amp; Switch Repair
          </p>
          {errors.title && (
            <p className="mt-1 text-sm text-rose-600">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="listing-description"
            className="mb-1 block text-sm font-medium"
          >
            Description{" "}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          </label>
          <textarea
            id="listing-description"
            rows={4}
            {...register("description")}
            className="w-full rounded-lg border border-slate-400/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-600"
          />
          <p className="mt-1 text-xs text-slate-500">
            What you do, tools or materials, and what the customer should
            prepare
          </p>
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
              Category{" "}
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <Controller
              name="category_id"
              control={control}
              render={({ field }) => (
                <SelectMenu
                  id="listing-category"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={(categoriesQuery.data ?? []).map((category) => ({
                    value: category.id,
                    label: category.name,
                  }))}
                  ariaLabel="Category"
                  placeholder="Select a category"
                  size="sm"
                />
              )}
            />
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
              Service area{" "}
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <Controller
              name="area_id"
              control={control}
              render={({ field }) => (
                <SelectMenu
                  id="listing-area"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={areas.map((area) => ({
                    value: area.id,
                    label: area.name,
                    group: getAreaGroup(area.slug),
                  }))}
                  ariaLabel="Service area"
                  placeholder="Select an area"
                  size="sm"
                />
              )}
            />
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
              Pricing{" "}
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
            </label>
            <Controller
              name="pricing_type"
              control={control}
              render={({ field }) => (
                <SelectMenu
                  id="listing-pricing"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={[
                    { value: "fixed", label: "Fixed price" },
                    { value: "hourly", label: "Per hour" },
                  ]}
                  ariaLabel="Pricing"
                  size="sm"
                />
              )}
            />
          </div>
          <div>
            <label
              htmlFor="listing-price"
              className="mb-1 block text-sm font-medium"
            >
              Price (Rs.){" "}
              <span className="text-red-500" aria-hidden="true">
                *
              </span>
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
              className="h-10 w-full rounded-lg border border-slate-400/50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-600"
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
              className="h-10 w-full rounded-lg border border-slate-400/50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-600"
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
            className="h-10 w-full rounded-lg border border-slate-400/50 px-3 text-sm outline-none focus:ring-2 focus:ring-teal-600"
          />
          <p className="mt-1 text-xs text-slate-500">
            e.g. Mon to Sat, 4pm to 8pm
          </p>
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
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onCoverChange}
            className="block min-h-11 w-full text-sm text-slate-600 file:me-3 file:h-10 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#E3F7EC] file:px-4 file:text-sm file:font-medium file:text-[#168A55] hover:file:bg-[#D3F0E1]"
          />
          <p className="mt-1 text-xs text-slate-500">
            Clear photo of your work or tools. 16:9 works best.
          </p>
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
            <div className="mt-2 flex items-center gap-3">
              {coverPreviewUrl && (
                <img
                  src={coverPreviewUrl}
                  alt="Cropped cover preview"
                  className="h-24 aspect-video rounded-lg object-cover border"
                />
              )}
              <div>
                <p className="text-sm text-slate-600">
                  Selected: {coverFile.name}
                </p>
                {pendingCoverFile && (
                  <button
                    type="button"
                    onClick={() => setIsCoverCropperOpen(true)}
                    className="mt-1 text-sm font-medium text-teal-700 underline"
                  >
                    Adjust
                  </button>
                )}
              </div>
            </div>
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
      {isCoverCropperOpen && pendingCoverFile && (
        <CoverCropper
          file={pendingCoverFile}
          onCancel={cancelCoverCrop}
          onDone={finishCoverCrop}
        />
      )}
    </section>
  );
}
