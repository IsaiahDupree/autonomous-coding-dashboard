"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RenderJobSchema = exports.RenderTypeSchema = exports.BeforeAfterInputSchema = exports.BeforeAfterTransitionSchema = exports.NanoBananaInputSchema = exports.VeoInputSchema = exports.CaptionInputSchema = exports.CaptionStyleSchema = exports.VoiceCloneInputSchema = exports.VoiceCloneProviderSchema = exports.RenderStaticInputSchema = exports.RenderVideoInputSchema = exports.ResolutionPresetSchema = exports.AspectRatioSchema = exports.AudioCodecSchema = exports.VideoCodecSchema = exports.StaticOutputFormatSchema = exports.VideoOutputFormatSchema = exports.RenderJobStatusSchema = void 0;
const zod_1 = require("zod");
// ---------------------------------------------------------------------------
// Render Job Status & Common Types
// ---------------------------------------------------------------------------
/**
 * Status of a render job.
 */
exports.RenderJobStatusSchema = zod_1.z.enum([
    "queued",
    "rendering",
    "post_processing",
    "uploading",
    "completed",
    "failed",
    "cancelled",
    "timed_out",
]);
/**
 * Output format for video renders.
 */
exports.VideoOutputFormatSchema = zod_1.z.enum(["mp4", "webm", "mov", "gif"]);
/**
 * Output format for static renders (images).
 */
exports.StaticOutputFormatSchema = zod_1.z.enum(["png", "jpeg", "webp", "pdf"]);
/**
 * Video codec.
 */
exports.VideoCodecSchema = zod_1.z.enum(["h264", "h265", "vp8", "vp9", "prores"]);
/**
 * Audio codec.
 */
exports.AudioCodecSchema = zod_1.z.enum(["aac", "mp3", "opus", "pcm"]);
/**
 * Aspect ratio presets.
 */
exports.AspectRatioSchema = zod_1.z.enum([
    "16:9",
    "9:16",
    "1:1",
    "4:3",
    "4:5",
    "21:9",
    "custom",
]);
/**
 * Resolution presets.
 */
exports.ResolutionPresetSchema = zod_1.z.enum([
    "360p",
    "480p",
    "720p",
    "1080p",
    "1440p",
    "2160p",
    "custom",
]);
// ---------------------------------------------------------------------------
// Render Video Input
// ---------------------------------------------------------------------------
/**
 * RenderVideoInput - Parameters for triggering a video render.
 */
exports.RenderVideoInputSchema = zod_1.z.object({
    /** Remotion composition ID. */
    compositionId: zod_1.z.string().min(1).max(256),
    /** Input props to pass to the composition. */
    inputProps: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    /** Output format. */
    outputFormat: exports.VideoOutputFormatSchema.default("mp4"),
    /** Video codec. */
    codec: exports.VideoCodecSchema.default("h264"),
    /** Audio codec. */
    audioCodec: exports.AudioCodecSchema.optional(),
    /** Output width in pixels. */
    width: zod_1.z.number().int().positive().optional(),
    /** Output height in pixels. */
    height: zod_1.z.number().int().positive().optional(),
    /** Aspect ratio. */
    aspectRatio: exports.AspectRatioSchema.optional(),
    /** Resolution preset. */
    resolution: exports.ResolutionPresetSchema.optional(),
    /** Frames per second. */
    fps: zod_1.z.number().positive().min(1).max(120).default(30),
    /** Duration in frames (overrides composition default). */
    durationInFrames: zod_1.z.number().int().positive().optional(),
    /** CRF (Constant Rate Factor) for quality. Lower = better quality. */
    crf: zod_1.z.number().int().min(0).max(51).optional(),
    /** Video bitrate (e.g., "5M", "10M"). */
    videoBitrate: zod_1.z.string().optional(),
    /** Audio bitrate (e.g., "128k", "320k"). */
    audioBitrate: zod_1.z.string().optional(),
    /** Whether to include audio. */
    muted: zod_1.z.boolean().default(false),
    /** Audio file URL to overlay. */
    audioUrl: zod_1.z.string().url().optional(),
    /** Audio volume multiplier (0-1). */
    audioVolume: zod_1.z.number().min(0).max(1).optional(),
    /** Start frame (for trimming). */
    startFrame: zod_1.z.number().int().nonnegative().optional(),
    /** End frame (for trimming). */
    endFrame: zod_1.z.number().int().positive().optional(),
    /** Number of parallel Lambda functions. */
    concurrency: zod_1.z.number().int().positive().max(200).optional(),
    /** Timeout in milliseconds. */
    timeoutMs: zod_1.z.number().int().positive().default(300000),
    /** Output S3 bucket (if not using default). */
    outputBucket: zod_1.z.string().optional(),
    /** Output key prefix. */
    outputKeyPrefix: zod_1.z.string().optional(),
    /** Webhook URL to notify on completion. */
    webhookUrl: zod_1.z.string().url().optional(),
    /** Webhook secret for signature verification. */
    webhookSecret: zod_1.z.string().optional(),
    /** Custom metadata to attach to the job. */
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
});
// ---------------------------------------------------------------------------
// Render Static Input
// ---------------------------------------------------------------------------
/**
 * RenderStaticInput - Parameters for rendering a static image.
 */
exports.RenderStaticInputSchema = zod_1.z.object({
    /** Remotion composition ID. */
    compositionId: zod_1.z.string().min(1).max(256),
    /** Input props to pass to the composition. */
    inputProps: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    /** Output format. */
    outputFormat: exports.StaticOutputFormatSchema.default("png"),
    /** Output width in pixels. */
    width: zod_1.z.number().int().positive().optional(),
    /** Output height in pixels. */
    height: zod_1.z.number().int().positive().optional(),
    /** Frame number to render. */
    frame: zod_1.z.number().int().nonnegative().default(0),
    /** JPEG/WebP quality (1-100). */
    quality: zod_1.z.number().int().min(1).max(100).optional(),
    /** Scale factor for higher resolution output. */
    scale: zod_1.z.number().positive().min(0.1).max(4).default(1),
    /** Transparent background (for PNG/WebP). */
    transparentBackground: zod_1.z.boolean().default(false),
    /** Output S3 bucket. */
    outputBucket: zod_1.z.string().optional(),
    /** Output key prefix. */
    outputKeyPrefix: zod_1.z.string().optional(),
    /** Timeout in milliseconds. */
    timeoutMs: zod_1.z.number().int().positive().default(60000),
    /** Webhook URL to notify on completion. */
    webhookUrl: zod_1.z.string().url().optional(),
    /** Custom metadata. */
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
});
// ---------------------------------------------------------------------------
// Voice Clone Input
// ---------------------------------------------------------------------------
/**
 * Voice cloning provider.
 */
exports.VoiceCloneProviderSchema = zod_1.z.enum([
    "elevenlabs",
    "playht",
    "resemble",
    "openai",
    "custom",
]);
/**
 * VoiceCloneInput - Parameters for cloning a voice.
 */
exports.VoiceCloneInputSchema = zod_1.z.object({
    /** Name for the cloned voice. */
    name: zod_1.z.string().min(1).max(256),
    /** Description of the voice. */
    description: zod_1.z.string().max(1024).optional(),
    /** Voice cloning provider. */
    provider: exports.VoiceCloneProviderSchema.default("elevenlabs"),
    /** Audio sample URLs for training (minimum 1, ideally 3+). */
    sampleUrls: zod_1.z.array(zod_1.z.string().url()).min(1).max(25),
    /** Labels/tags for the voice. */
    labels: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    /** Target language (ISO 639-1). */
    language: zod_1.z.string().max(10).optional(),
    /** Gender hint. */
    gender: zod_1.z.enum(["male", "female", "neutral"]).optional(),
    /** Age range hint. */
    ageRange: zod_1.z.enum(["child", "young_adult", "adult", "senior"]).optional(),
    /** Accent description. */
    accent: zod_1.z.string().max(128).optional(),
    /** Whether to remove background noise from samples. */
    removeBackgroundNoise: zod_1.z.boolean().default(true),
    /** Custom metadata. */
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
});
// ---------------------------------------------------------------------------
// Caption Input
// ---------------------------------------------------------------------------
/**
 * Caption style preset.
 */
exports.CaptionStyleSchema = zod_1.z.enum([
    "default",
    "karaoke",
    "subtitle",
    "word_by_word",
    "sentence",
    "tiktok",
    "hormozi",
    "custom",
]);
/**
 * CaptionInput - Parameters for generating captions/subtitles.
 */
exports.CaptionInputSchema = zod_1.z.object({
    /** URL of the audio or video file to caption. */
    mediaUrl: zod_1.z.string().url(),
    /** Target language for captions (ISO 639-1). */
    language: zod_1.z.string().max(10).default("en"),
    /** Caption style. */
    style: exports.CaptionStyleSchema.default("default"),
    /** Maximum characters per caption line. */
    maxCharsPerLine: zod_1.z.number().int().positive().default(42),
    /** Maximum number of lines per caption. */
    maxLines: zod_1.z.number().int().positive().max(4).default(2),
    /** Maximum words per caption segment. */
    maxWordsPerSegment: zod_1.z.number().int().positive().optional(),
    /** Font family. */
    fontFamily: zod_1.z.string().max(256).optional(),
    /** Font size in pixels. */
    fontSize: zod_1.z.number().positive().optional(),
    /** Font weight. */
    fontWeight: zod_1.z.enum(["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"]).optional(),
    /** Text color (hex). */
    textColor: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/).optional(),
    /** Background/highlight color (hex). */
    backgroundColor: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/).optional(),
    /** Active word highlight color (hex). */
    highlightColor: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/).optional(),
    /** Outline/stroke color (hex). */
    outlineColor: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/).optional(),
    /** Outline width in pixels. */
    outlineWidth: zod_1.z.number().nonnegative().optional(),
    /** Vertical position (0 = top, 1 = bottom). */
    verticalPosition: zod_1.z.number().min(0).max(1).optional(),
    /** Whether to translate captions. */
    translate: zod_1.z.boolean().default(false),
    /** Target translation language (ISO 639-1). */
    translateTo: zod_1.z.string().max(10).optional(),
    /** Output format for standalone caption files. */
    outputFormat: zod_1.z.enum(["srt", "vtt", "ass", "json"]).optional(),
    /** Custom metadata. */
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
});
// ---------------------------------------------------------------------------
// Veo Input (Google Veo video generation)
// ---------------------------------------------------------------------------
/**
 * VeoInput - Parameters for Google Veo AI video generation.
 */
exports.VeoInputSchema = zod_1.z.object({
    /** Text prompt describing the desired video. */
    prompt: zod_1.z.string().min(1).max(2048),
    /** Negative prompt (what to avoid). */
    negativePrompt: zod_1.z.string().max(2048).optional(),
    /** Reference image URL for image-to-video. */
    referenceImageUrl: zod_1.z.string().url().optional(),
    /** Reference video URL for video-to-video. */
    referenceVideoUrl: zod_1.z.string().url().optional(),
    /** Duration in seconds. */
    durationSeconds: zod_1.z.number().positive().max(60).default(4),
    /** Aspect ratio. */
    aspectRatio: exports.AspectRatioSchema.default("16:9"),
    /** Output resolution. */
    resolution: exports.ResolutionPresetSchema.optional(),
    /** Number of variations to generate. */
    numVariations: zod_1.z.number().int().positive().max(4).default(1),
    /** Seed for reproducibility. */
    seed: zod_1.z.number().int().nonnegative().optional(),
    /** Generation guidance scale. */
    guidanceScale: zod_1.z.number().positive().optional(),
    /** Whether to upscale output. */
    upscale: zod_1.z.boolean().default(false),
    /** Whether to add slow motion. */
    slowMotion: zod_1.z.boolean().default(false),
    /** Model version. */
    modelVersion: zod_1.z.string().optional(),
    /** Webhook URL. */
    webhookUrl: zod_1.z.string().url().optional(),
    /** Custom metadata. */
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
});
// ---------------------------------------------------------------------------
// NanoBanana Input (fast AI image generation)
// ---------------------------------------------------------------------------
/**
 * NanoBananaInput - Parameters for NanoBanana fast image/video generation.
 */
exports.NanoBananaInputSchema = zod_1.z.object({
    /** Text prompt. */
    prompt: zod_1.z.string().min(1).max(2048),
    /** Negative prompt. */
    negativePrompt: zod_1.z.string().max(2048).optional(),
    /** Model to use. */
    model: zod_1.z.string().min(1).max(256),
    /** Number of images to generate. */
    numImages: zod_1.z.number().int().positive().max(8).default(1),
    /** Output width in pixels. */
    width: zod_1.z.number().int().positive().default(1024),
    /** Output height in pixels. */
    height: zod_1.z.number().int().positive().default(1024),
    /** Number of inference steps. */
    steps: zod_1.z.number().int().positive().max(150).default(30),
    /** Guidance scale (CFG). */
    guidanceScale: zod_1.z.number().positive().default(7.5),
    /** Seed for reproducibility. */
    seed: zod_1.z.number().int().nonnegative().optional(),
    /** LoRA models to apply. */
    loras: zod_1.z
        .array(zod_1.z.object({
        url: zod_1.z.string().url(),
        scale: zod_1.z.number().min(0).max(2).default(1),
    }))
        .optional(),
    /** Controlnet configuration. */
    controlnet: zod_1.z
        .object({
        model: zod_1.z.string().min(1),
        imageUrl: zod_1.z.string().url(),
        conditioningScale: zod_1.z.number().min(0).max(2).default(1),
    })
        .optional(),
    /** Image-to-image reference. */
    initImageUrl: zod_1.z.string().url().optional(),
    /** Denoising strength for img2img (0-1). */
    denoisingStrength: zod_1.z.number().min(0).max(1).optional(),
    /** Scheduler/sampler. */
    scheduler: zod_1.z.string().max(128).optional(),
    /** Output format. */
    outputFormat: zod_1.z.enum(["png", "jpeg", "webp"]).default("png"),
    /** JPEG/WebP quality. */
    quality: zod_1.z.number().int().min(1).max(100).optional(),
    /** Webhook URL. */
    webhookUrl: zod_1.z.string().url().optional(),
    /** Custom metadata. */
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
});
// ---------------------------------------------------------------------------
// Before/After Input (comparison videos/images)
// ---------------------------------------------------------------------------
/**
 * Transition style for before/after comparison.
 */
exports.BeforeAfterTransitionSchema = zod_1.z.enum([
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
/**
 * BeforeAfterInput - Parameters for creating before/after comparison content.
 */
exports.BeforeAfterInputSchema = zod_1.z.object({
    /** URL of the "before" media (image or video). */
    beforeUrl: zod_1.z.string().url(),
    /** URL of the "after" media (image or video). */
    afterUrl: zod_1.z.string().url(),
    /** Label for the "before" side. */
    beforeLabel: zod_1.z.string().max(128).default("Before"),
    /** Label for the "after" side. */
    afterLabel: zod_1.z.string().max(128).default("After"),
    /** Transition style. */
    transition: exports.BeforeAfterTransitionSchema.default("slider"),
    /** Transition duration in milliseconds. */
    transitionDurationMs: zod_1.z.number().int().positive().default(1000),
    /** Hold duration on each side in milliseconds. */
    holdDurationMs: zod_1.z.number().int().nonnegative().default(2000),
    /** Output type. */
    outputType: zod_1.z.enum(["video", "image", "gif"]).default("video"),
    /** Output width. */
    width: zod_1.z.number().int().positive().optional(),
    /** Output height. */
    height: zod_1.z.number().int().positive().optional(),
    /** FPS for video output. */
    fps: zod_1.z.number().positive().default(30),
    /** Whether to loop the animation. */
    loop: zod_1.z.boolean().default(true),
    /** Number of loops (0 = infinite). */
    loopCount: zod_1.z.number().int().nonnegative().default(0),
    /** Font family for labels. */
    labelFontFamily: zod_1.z.string().max(256).optional(),
    /** Font size for labels. */
    labelFontSize: zod_1.z.number().positive().optional(),
    /** Label text color (hex). */
    labelColor: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/).optional(),
    /** Divider/slider color (hex). */
    dividerColor: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/).optional(),
    /** Divider width in pixels. */
    dividerWidth: zod_1.z.number().positive().default(3),
    /** Webhook URL. */
    webhookUrl: zod_1.z.string().url().optional(),
    /** Custom metadata. */
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
});
// ---------------------------------------------------------------------------
// Render Job (output record)
// ---------------------------------------------------------------------------
/**
 * Render type discriminator.
 */
exports.RenderTypeSchema = zod_1.z.enum([
    "video",
    "static",
    "voice_clone",
    "caption",
    "veo",
    "nano_banana",
    "before_after",
]);
/**
 * RenderJob - Represents a render job and its current state.
 */
exports.RenderJobSchema = zod_1.z.object({
    /** Unique render job identifier (UUID v4). */
    id: zod_1.z.string().uuid(),
    /** The user who initiated this render. */
    userId: zod_1.z.string().uuid(),
    /** Render type. */
    type: exports.RenderTypeSchema,
    /** Current job status. */
    status: exports.RenderJobStatusSchema.default("queued"),
    /** Progress percentage (0-100). */
    progress: zod_1.z.number().min(0).max(100).default(0),
    /** Composition ID (for Remotion renders). */
    compositionId: zod_1.z.string().max(256).optional(),
    /** Input parameters (the original request). */
    input: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    /** Output file URL (populated on completion). */
    outputUrl: zod_1.z.string().url().optional(),
    /** Output file size in bytes. */
    outputSizeBytes: zod_1.z.number().int().nonnegative().optional(),
    /** Output duration in milliseconds (for video/audio). */
    outputDurationMs: zod_1.z.number().int().nonnegative().optional(),
    /** Output dimensions. */
    outputWidth: zod_1.z.number().int().positive().optional(),
    outputHeight: zod_1.z.number().int().positive().optional(),
    /** Thumbnail URL. */
    thumbnailUrl: zod_1.z.string().url().optional(),
    /** CDN URL for the output. */
    cdnUrl: zod_1.z.string().url().optional(),
    /** S3/storage bucket. */
    storageBucket: zod_1.z.string().optional(),
    /** S3/storage key. */
    storageKey: zod_1.z.string().optional(),
    /** Error message (if failed). */
    errorMessage: zod_1.z.string().max(4096).optional(),
    /** Error code. */
    errorCode: zod_1.z.string().max(128).optional(),
    /** Number of retry attempts. */
    retryCount: zod_1.z.number().int().nonnegative().default(0),
    /** Maximum allowed retries. */
    maxRetries: zod_1.z.number().int().nonnegative().default(3),
    /** Rendering duration in milliseconds. */
    renderDurationMs: zod_1.z.number().int().nonnegative().optional(),
    /** Cost in credits consumed. */
    creditsConsumed: zod_1.z.number().nonnegative().optional(),
    /** Lambda/function invocation ID (for serverless renders). */
    invocationId: zod_1.z.string().optional(),
    /** Webhook URL to notify. */
    webhookUrl: zod_1.z.string().url().optional(),
    /** Whether webhook was successfully delivered. */
    webhookDelivered: zod_1.z.boolean().optional(),
    /** Custom metadata. */
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    /** ISO 8601 timestamp when the job was queued. */
    queuedAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp when rendering started. */
    startedAt: zod_1.z.string().datetime().optional(),
    /** ISO 8601 timestamp when the job completed. */
    completedAt: zod_1.z.string().datetime().optional(),
    /** ISO 8601 timestamp of creation. */
    createdAt: zod_1.z.string().datetime(),
    /** ISO 8601 timestamp of last update. */
    updatedAt: zod_1.z.string().datetime(),
});
//# sourceMappingURL=remotion.js.map