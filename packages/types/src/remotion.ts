import { z } from "zod";

// ---------------------------------------------------------------------------
// Render Job Status & Common Types
// ---------------------------------------------------------------------------

/**
 * Status of a render job.
 */
export const RenderJobStatusSchema = z.enum([
  "queued",
  "rendering",
  "post_processing",
  "uploading",
  "completed",
  "failed",
  "cancelled",
  "timed_out",
]);
export type RenderJobStatus = z.infer<typeof RenderJobStatusSchema>;

/**
 * Output format for video renders.
 */
export const VideoOutputFormatSchema = z.enum(["mp4", "webm", "mov", "gif"]);
export type VideoOutputFormat = z.infer<typeof VideoOutputFormatSchema>;

/**
 * Output format for static renders (images).
 */
export const StaticOutputFormatSchema = z.enum(["png", "jpeg", "webp", "pdf"]);
export type StaticOutputFormat = z.infer<typeof StaticOutputFormatSchema>;

/**
 * Video codec.
 */
export const VideoCodecSchema = z.enum(["h264", "h265", "vp8", "vp9", "prores"]);
export type VideoCodec = z.infer<typeof VideoCodecSchema>;

/**
 * Audio codec.
 */
export const AudioCodecSchema = z.enum(["aac", "mp3", "opus", "pcm"]);
export type AudioCodec = z.infer<typeof AudioCodecSchema>;

/**
 * Aspect ratio presets.
 */
export const AspectRatioSchema = z.enum([
  "16:9",
  "9:16",
  "1:1",
  "4:3",
  "4:5",
  "21:9",
  "custom",
]);
export type AspectRatio = z.infer<typeof AspectRatioSchema>;

/**
 * Resolution presets.
 */
export const ResolutionPresetSchema = z.enum([
  "360p",
  "480p",
  "720p",
  "1080p",
  "1440p",
  "2160p",
  "custom",
]);
export type ResolutionPreset = z.infer<typeof ResolutionPresetSchema>;

// ---------------------------------------------------------------------------
// Render Video Input
// ---------------------------------------------------------------------------

/**
 * RenderVideoInput - Parameters for triggering a video render.
 */
export const RenderVideoInputSchema = z.object({
  /** Remotion composition ID. */
  compositionId: z.string().min(1).max(256),

  /** Input props to pass to the composition. */
  inputProps: z.record(z.string(), z.unknown()).default({}),

  /** Output format. */
  outputFormat: VideoOutputFormatSchema.default("mp4"),

  /** Video codec. */
  codec: VideoCodecSchema.default("h264"),

  /** Audio codec. */
  audioCodec: AudioCodecSchema.optional(),

  /** Output width in pixels. */
  width: z.number().int().positive().optional(),

  /** Output height in pixels. */
  height: z.number().int().positive().optional(),

  /** Aspect ratio. */
  aspectRatio: AspectRatioSchema.optional(),

  /** Resolution preset. */
  resolution: ResolutionPresetSchema.optional(),

  /** Frames per second. */
  fps: z.number().positive().min(1).max(120).default(30),

  /** Duration in frames (overrides composition default). */
  durationInFrames: z.number().int().positive().optional(),

  /** CRF (Constant Rate Factor) for quality. Lower = better quality. */
  crf: z.number().int().min(0).max(51).optional(),

  /** Video bitrate (e.g., "5M", "10M"). */
  videoBitrate: z.string().optional(),

  /** Audio bitrate (e.g., "128k", "320k"). */
  audioBitrate: z.string().optional(),

  /** Whether to include audio. */
  muted: z.boolean().default(false),

  /** Audio file URL to overlay. */
  audioUrl: z.string().url().optional(),

  /** Audio volume multiplier (0-1). */
  audioVolume: z.number().min(0).max(1).optional(),

  /** Start frame (for trimming). */
  startFrame: z.number().int().nonnegative().optional(),

  /** End frame (for trimming). */
  endFrame: z.number().int().positive().optional(),

  /** Number of parallel Lambda functions. */
  concurrency: z.number().int().positive().max(200).optional(),

  /** Timeout in milliseconds. */
  timeoutMs: z.number().int().positive().default(300000),

  /** Output S3 bucket (if not using default). */
  outputBucket: z.string().optional(),

  /** Output key prefix. */
  outputKeyPrefix: z.string().optional(),

  /** Webhook URL to notify on completion. */
  webhookUrl: z.string().url().optional(),

  /** Webhook secret for signature verification. */
  webhookSecret: z.string().optional(),

  /** Custom metadata to attach to the job. */
  metadata: z.record(z.string(), z.string()).optional(),
});

export type RenderVideoInput = z.infer<typeof RenderVideoInputSchema>;

// ---------------------------------------------------------------------------
// Render Static Input
// ---------------------------------------------------------------------------

/**
 * RenderStaticInput - Parameters for rendering a static image.
 */
export const RenderStaticInputSchema = z.object({
  /** Remotion composition ID. */
  compositionId: z.string().min(1).max(256),

  /** Input props to pass to the composition. */
  inputProps: z.record(z.string(), z.unknown()).default({}),

  /** Output format. */
  outputFormat: StaticOutputFormatSchema.default("png"),

  /** Output width in pixels. */
  width: z.number().int().positive().optional(),

  /** Output height in pixels. */
  height: z.number().int().positive().optional(),

  /** Frame number to render. */
  frame: z.number().int().nonnegative().default(0),

  /** JPEG/WebP quality (1-100). */
  quality: z.number().int().min(1).max(100).optional(),

  /** Scale factor for higher resolution output. */
  scale: z.number().positive().min(0.1).max(4).default(1),

  /** Transparent background (for PNG/WebP). */
  transparentBackground: z.boolean().default(false),

  /** Output S3 bucket. */
  outputBucket: z.string().optional(),

  /** Output key prefix. */
  outputKeyPrefix: z.string().optional(),

  /** Timeout in milliseconds. */
  timeoutMs: z.number().int().positive().default(60000),

  /** Webhook URL to notify on completion. */
  webhookUrl: z.string().url().optional(),

  /** Custom metadata. */
  metadata: z.record(z.string(), z.string()).optional(),
});

export type RenderStaticInput = z.infer<typeof RenderStaticInputSchema>;

// ---------------------------------------------------------------------------
// Voice Clone Input
// ---------------------------------------------------------------------------

/**
 * Voice cloning provider.
 */
export const VoiceCloneProviderSchema = z.enum([
  "elevenlabs",
  "playht",
  "resemble",
  "openai",
  "custom",
]);
export type VoiceCloneProvider = z.infer<typeof VoiceCloneProviderSchema>;

/**
 * VoiceCloneInput - Parameters for cloning a voice.
 */
export const VoiceCloneInputSchema = z.object({
  /** Name for the cloned voice. */
  name: z.string().min(1).max(256),

  /** Description of the voice. */
  description: z.string().max(1024).optional(),

  /** Voice cloning provider. */
  provider: VoiceCloneProviderSchema.default("elevenlabs"),

  /** Audio sample URLs for training (minimum 1, ideally 3+). */
  sampleUrls: z.array(z.string().url()).min(1).max(25),

  /** Labels/tags for the voice. */
  labels: z.record(z.string(), z.string()).optional(),

  /** Target language (ISO 639-1). */
  language: z.string().max(10).optional(),

  /** Gender hint. */
  gender: z.enum(["male", "female", "neutral"]).optional(),

  /** Age range hint. */
  ageRange: z.enum(["child", "young_adult", "adult", "senior"]).optional(),

  /** Accent description. */
  accent: z.string().max(128).optional(),

  /** Whether to remove background noise from samples. */
  removeBackgroundNoise: z.boolean().default(true),

  /** Custom metadata. */
  metadata: z.record(z.string(), z.string()).optional(),
});

export type VoiceCloneInput = z.infer<typeof VoiceCloneInputSchema>;

// ---------------------------------------------------------------------------
// Caption Input
// ---------------------------------------------------------------------------

/**
 * Caption style preset.
 */
export const CaptionStyleSchema = z.enum([
  "default",
  "karaoke",
  "subtitle",
  "word_by_word",
  "sentence",
  "tiktok",
  "hormozi",
  "custom",
]);
export type CaptionStyle = z.infer<typeof CaptionStyleSchema>;

/**
 * CaptionInput - Parameters for generating captions/subtitles.
 */
export const CaptionInputSchema = z.object({
  /** URL of the audio or video file to caption. */
  mediaUrl: z.string().url(),

  /** Target language for captions (ISO 639-1). */
  language: z.string().max(10).default("en"),

  /** Caption style. */
  style: CaptionStyleSchema.default("default"),

  /** Maximum characters per caption line. */
  maxCharsPerLine: z.number().int().positive().default(42),

  /** Maximum number of lines per caption. */
  maxLines: z.number().int().positive().max(4).default(2),

  /** Maximum words per caption segment. */
  maxWordsPerSegment: z.number().int().positive().optional(),

  /** Font family. */
  fontFamily: z.string().max(256).optional(),

  /** Font size in pixels. */
  fontSize: z.number().positive().optional(),

  /** Font weight. */
  fontWeight: z.enum(["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"]).optional(),

  /** Text color (hex). */
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/).optional(),

  /** Background/highlight color (hex). */
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/).optional(),

  /** Active word highlight color (hex). */
  highlightColor: z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/).optional(),

  /** Outline/stroke color (hex). */
  outlineColor: z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/).optional(),

  /** Outline width in pixels. */
  outlineWidth: z.number().nonnegative().optional(),

  /** Vertical position (0 = top, 1 = bottom). */
  verticalPosition: z.number().min(0).max(1).optional(),

  /** Whether to translate captions. */
  translate: z.boolean().default(false),

  /** Target translation language (ISO 639-1). */
  translateTo: z.string().max(10).optional(),

  /** Output format for standalone caption files. */
  outputFormat: z.enum(["srt", "vtt", "ass", "json"]).optional(),

  /** Custom metadata. */
  metadata: z.record(z.string(), z.string()).optional(),
});

export type CaptionInput = z.infer<typeof CaptionInputSchema>;

// ---------------------------------------------------------------------------
// Veo Input (Google Veo video generation)
// ---------------------------------------------------------------------------

/**
 * VeoInput - Parameters for Google Veo AI video generation.
 */
export const VeoInputSchema = z.object({
  /** Text prompt describing the desired video. */
  prompt: z.string().min(1).max(2048),

  /** Negative prompt (what to avoid). */
  negativePrompt: z.string().max(2048).optional(),

  /** Reference image URL for image-to-video. */
  referenceImageUrl: z.string().url().optional(),

  /** Reference video URL for video-to-video. */
  referenceVideoUrl: z.string().url().optional(),

  /** Duration in seconds. */
  durationSeconds: z.number().positive().max(60).default(4),

  /** Aspect ratio. */
  aspectRatio: AspectRatioSchema.default("16:9"),

  /** Output resolution. */
  resolution: ResolutionPresetSchema.optional(),

  /** Number of variations to generate. */
  numVariations: z.number().int().positive().max(4).default(1),

  /** Seed for reproducibility. */
  seed: z.number().int().nonnegative().optional(),

  /** Generation guidance scale. */
  guidanceScale: z.number().positive().optional(),

  /** Whether to upscale output. */
  upscale: z.boolean().default(false),

  /** Whether to add slow motion. */
  slowMotion: z.boolean().default(false),

  /** Model version. */
  modelVersion: z.string().optional(),

  /** Webhook URL. */
  webhookUrl: z.string().url().optional(),

  /** Custom metadata. */
  metadata: z.record(z.string(), z.string()).optional(),
});

export type VeoInput = z.infer<typeof VeoInputSchema>;

// ---------------------------------------------------------------------------
// NanoBanana Input (fast AI image generation)
// ---------------------------------------------------------------------------

/**
 * NanoBananaInput - Parameters for NanoBanana fast image/video generation.
 */
export const NanoBananaInputSchema = z.object({
  /** Text prompt. */
  prompt: z.string().min(1).max(2048),

  /** Negative prompt. */
  negativePrompt: z.string().max(2048).optional(),

  /** Model to use. */
  model: z.string().min(1).max(256),

  /** Number of images to generate. */
  numImages: z.number().int().positive().max(8).default(1),

  /** Output width in pixels. */
  width: z.number().int().positive().default(1024),

  /** Output height in pixels. */
  height: z.number().int().positive().default(1024),

  /** Number of inference steps. */
  steps: z.number().int().positive().max(150).default(30),

  /** Guidance scale (CFG). */
  guidanceScale: z.number().positive().default(7.5),

  /** Seed for reproducibility. */
  seed: z.number().int().nonnegative().optional(),

  /** LoRA models to apply. */
  loras: z
    .array(
      z.object({
        url: z.string().url(),
        scale: z.number().min(0).max(2).default(1),
      })
    )
    .optional(),

  /** Controlnet configuration. */
  controlnet: z
    .object({
      model: z.string().min(1),
      imageUrl: z.string().url(),
      conditioningScale: z.number().min(0).max(2).default(1),
    })
    .optional(),

  /** Image-to-image reference. */
  initImageUrl: z.string().url().optional(),

  /** Denoising strength for img2img (0-1). */
  denoisingStrength: z.number().min(0).max(1).optional(),

  /** Scheduler/sampler. */
  scheduler: z.string().max(128).optional(),

  /** Output format. */
  outputFormat: z.enum(["png", "jpeg", "webp"]).default("png"),

  /** JPEG/WebP quality. */
  quality: z.number().int().min(1).max(100).optional(),

  /** Webhook URL. */
  webhookUrl: z.string().url().optional(),

  /** Custom metadata. */
  metadata: z.record(z.string(), z.string()).optional(),
});

export type NanoBananaInput = z.infer<typeof NanoBananaInputSchema>;

// ---------------------------------------------------------------------------
// Before/After Input (comparison videos/images)
// ---------------------------------------------------------------------------

/**
 * Transition style for before/after comparison.
 */
export const BeforeAfterTransitionSchema = z.enum([
  "slider",
  "wipe_left",
  "wipe_right",
  "wipe_up",
  "wipe_down",
  "fade",
  "split",
  "circle_reveal",
  "diagonal",
  "custom",
]);
export type BeforeAfterTransition = z.infer<typeof BeforeAfterTransitionSchema>;

/**
 * BeforeAfterInput - Parameters for creating before/after comparison content.
 */
export const BeforeAfterInputSchema = z.object({
  /** URL of the "before" media (image or video). */
  beforeUrl: z.string().url(),

  /** URL of the "after" media (image or video). */
  afterUrl: z.string().url(),

  /** Label for the "before" side. */
  beforeLabel: z.string().max(128).default("Before"),

  /** Label for the "after" side. */
  afterLabel: z.string().max(128).default("After"),

  /** Transition style. */
  transition: BeforeAfterTransitionSchema.default("slider"),

  /** Transition duration in milliseconds. */
  transitionDurationMs: z.number().int().positive().default(1000),

  /** Hold duration on each side in milliseconds. */
  holdDurationMs: z.number().int().nonnegative().default(2000),

  /** Output type. */
  outputType: z.enum(["video", "image", "gif"]).default("video"),

  /** Output width. */
  width: z.number().int().positive().optional(),

  /** Output height. */
  height: z.number().int().positive().optional(),

  /** FPS for video output. */
  fps: z.number().positive().default(30),

  /** Whether to loop the animation. */
  loop: z.boolean().default(true),

  /** Number of loops (0 = infinite). */
  loopCount: z.number().int().nonnegative().default(0),

  /** Font family for labels. */
  labelFontFamily: z.string().max(256).optional(),

  /** Font size for labels. */
  labelFontSize: z.number().positive().optional(),

  /** Label text color (hex). */
  labelColor: z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/).optional(),

  /** Divider/slider color (hex). */
  dividerColor: z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/).optional(),

  /** Divider width in pixels. */
  dividerWidth: z.number().positive().default(3),

  /** Webhook URL. */
  webhookUrl: z.string().url().optional(),

  /** Custom metadata. */
  metadata: z.record(z.string(), z.string()).optional(),
});

export type BeforeAfterInput = z.infer<typeof BeforeAfterInputSchema>;

// ---------------------------------------------------------------------------
// Render Job (output record)
// ---------------------------------------------------------------------------

/**
 * Render type discriminator.
 */
export const RenderTypeSchema = z.enum([
  "video",
  "static",
  "voice_clone",
  "caption",
  "veo",
  "nano_banana",
  "before_after",
]);
export type RenderType = z.infer<typeof RenderTypeSchema>;

/**
 * RenderJob - Represents a render job and its current state.
 */
export const RenderJobSchema = z.object({
  /** Unique render job identifier (UUID v4). */
  id: z.string().uuid(),

  /** The user who initiated this render. */
  userId: z.string().uuid(),

  /** Render type. */
  type: RenderTypeSchema,

  /** Current job status. */
  status: RenderJobStatusSchema.default("queued"),

  /** Progress percentage (0-100). */
  progress: z.number().min(0).max(100).default(0),

  /** Composition ID (for Remotion renders). */
  compositionId: z.string().max(256).optional(),

  /** Input parameters (the original request). */
  input: z.record(z.string(), z.unknown()),

  /** Output file URL (populated on completion). */
  outputUrl: z.string().url().optional(),

  /** Output file size in bytes. */
  outputSizeBytes: z.number().int().nonnegative().optional(),

  /** Output duration in milliseconds (for video/audio). */
  outputDurationMs: z.number().int().nonnegative().optional(),

  /** Output dimensions. */
  outputWidth: z.number().int().positive().optional(),
  outputHeight: z.number().int().positive().optional(),

  /** Thumbnail URL. */
  thumbnailUrl: z.string().url().optional(),

  /** CDN URL for the output. */
  cdnUrl: z.string().url().optional(),

  /** S3/storage bucket. */
  storageBucket: z.string().optional(),

  /** S3/storage key. */
  storageKey: z.string().optional(),

  /** Error message (if failed). */
  errorMessage: z.string().max(4096).optional(),

  /** Error code. */
  errorCode: z.string().max(128).optional(),

  /** Number of retry attempts. */
  retryCount: z.number().int().nonnegative().default(0),

  /** Maximum allowed retries. */
  maxRetries: z.number().int().nonnegative().default(3),

  /** Rendering duration in milliseconds. */
  renderDurationMs: z.number().int().nonnegative().optional(),

  /** Cost in credits consumed. */
  creditsConsumed: z.number().nonnegative().optional(),

  /** Lambda/function invocation ID (for serverless renders). */
  invocationId: z.string().optional(),

  /** Webhook URL to notify. */
  webhookUrl: z.string().url().optional(),

  /** Whether webhook was successfully delivered. */
  webhookDelivered: z.boolean().optional(),

  /** Custom metadata. */
  metadata: z.record(z.string(), z.string()).optional(),

  /** ISO 8601 timestamp when the job was queued. */
  queuedAt: z.string().datetime(),

  /** ISO 8601 timestamp when rendering started. */
  startedAt: z.string().datetime().optional(),

  /** ISO 8601 timestamp when the job completed. */
  completedAt: z.string().datetime().optional(),

  /** ISO 8601 timestamp of creation. */
  createdAt: z.string().datetime(),

  /** ISO 8601 timestamp of last update. */
  updatedAt: z.string().datetime(),
});

export type RenderJob = z.infer<typeof RenderJobSchema>;
