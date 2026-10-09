import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from "react";

type CoverCropperProps = {
  file: File;
  onCancel: () => void;
  onDone: (cropped: File) => void;
  aspect?: number;
  outputSize?: Size;
  title?: string;
};

type Point = { x: number; y: number };
type Size = { width: number; height: number };
type DragStart = Point & {
  clientX: number;
  clientY: number;
  pointerId: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampPosition(
  position: Point,
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
): Point {
  return {
    x: clamp(position.x, frameWidth - imageWidth, 0),
    y: clamp(position.y, frameHeight - imageHeight, 0),
  };
}

export function CoverCropper({
  file,
  onCancel,
  onDone,
  aspect = 16 / 9,
  outputSize = { width: 1280, height: 720 },
  title = "Adjust cover photo",
}: CoverCropperProps) {
  const [objectUrl, setObjectUrl] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [naturalSize, setNaturalSize] = useState<Size>({ width: 0, height: 0 });
  const [frameSize, setFrameSize] = useState<Size>({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef<DragStart | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    setLoadError(false);
    setNaturalSize({ width: 0, height: 0 });
    setZoom(1);
    setPosition({ x: 0, y: 0 });

    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    function updateSize() {
      const rect = frame?.getBoundingClientRect();
      if (!rect) return;
      setFrameSize({ width: rect.width, height: rect.height });
    }

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  const baseScale =
    naturalSize.width > 0 && frameSize.width > 0 && frameSize.height > 0
      ? Math.max(
          frameSize.width / naturalSize.width,
          frameSize.height / naturalSize.height,
        )
      : 0;
  const displayScale = baseScale * zoom;
  const imageWidth = naturalSize.width * displayScale;
  const imageHeight = naturalSize.height * displayScale;
  const boundedPosition = clampPosition(
    position,
    imageWidth,
    imageHeight,
    frameSize.width,
    frameSize.height,
  );

  function handleImageLoad() {
    const image = imageRef.current;
    const frame = frameRef.current;
    if (!image || !frame) return;

    const rect = frame.getBoundingClientRect();
    const size = { width: rect.width, height: rect.height };
    setFrameSize(size);
    setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight });
    const scale = Math.max(
      size.width / image.naturalWidth,
      size.height / image.naturalHeight,
    );
    setPosition({
      x: (size.width - image.naturalWidth * scale) / 2,
      y: (size.height - image.naturalHeight * scale) / 2,
    });
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!naturalSize.width) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: event.pointerId,
      x: boundedPosition.x,
      y: boundedPosition.y,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;

    setPosition(
      clampPosition(
        {
          x: start.x + event.clientX - start.clientX,
          y: start.y + event.clientY - start.clientY,
        },
        imageWidth,
        imageHeight,
        frameSize.width,
        frameSize.height,
      ),
    );
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragStartRef.current?.pointerId === event.pointerId) {
      dragStartRef.current = null;
    }
  }

  function handleZoomChange(event: ChangeEvent<HTMLInputElement>) {
    const nextZoom = Number(event.currentTarget.value);
    const nextScale = baseScale * nextZoom;
    const centerImageX =
      (frameSize.width / 2 - boundedPosition.x) / displayScale;
    const centerImageY =
      (frameSize.height / 2 - boundedPosition.y) / displayScale;

    setPosition(
      clampPosition(
        {
          x: frameSize.width / 2 - centerImageX * nextScale,
          y: frameSize.height / 2 - centerImageY * nextScale,
        },
        naturalSize.width * nextScale,
        naturalSize.height * nextScale,
        frameSize.width,
        frameSize.height,
      ),
    );
    setZoom(nextZoom);
  }

  function handleUsePhoto() {
    const image = imageRef.current;
    if (!image || !displayScale || !frameSize.width || !frameSize.height)
      return;

    const sourceX = -boundedPosition.x / displayScale;
    const sourceY = -boundedPosition.y / displayScale;
    const sourceWidth = frameSize.width / displayScale;
    const sourceHeight = frameSize.height / displayScale;
    const canvas = document.createElement("canvas");
    canvas.width = outputSize.width;
    canvas.height = outputSize.height;
    const context = canvas.getContext("2d");

    if (!context) {
      onCancel();
      return;
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          onCancel();
          return;
        }

        const baseName = file.name.replace(/\.[^/.]+$/, "");
        onDone(new File([blob], `${baseName}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.85,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cover-cropper-title"
        className="my-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5"
      >
        <h2 id="cover-cropper-title" className="text-lg font-semibold">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Drag to choose the visible part. This is how customers will see it.
        </p>

        <div
          ref={frameRef}
          className="relative mx-auto mt-5 w-full max-w-[480px] overflow-hidden rounded-xl bg-slate-100"
          style={{ aspectRatio: aspect, touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {objectUrl && (
            <img
              ref={imageRef}
              src={objectUrl}
              alt="Cover crop preview"
              draggable={false}
              onLoad={handleImageLoad}
              onError={() => setLoadError(true)}
              className="pointer-events-none absolute max-w-none select-none"
              style={{
                left: boundedPosition.x,
                top: boundedPosition.y,
                width: imageWidth,
                height: imageHeight,
              }}
            />
          )}
        </div>

        {loadError ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            This image could not be loaded. Choose another photo.
          </p>
        ) : (
          <label className="mt-5 block text-sm font-medium text-slate-700">
            Zoom
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={handleZoomChange}
              disabled={!naturalSize.width}
              className="mt-2 block w-full accent-[#1DBF73]"
            />
          </label>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          {!loadError && (
            <button
              type="button"
              onClick={handleUsePhoto}
              disabled={!naturalSize.width}
              className="min-h-11 rounded-lg bg-[#1DBF73] px-4 text-sm font-medium text-white transition-colors hover:bg-[#19A463] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Use this photo
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
