import { z } from "zod";
/**
 * Status of a render job.
 */
export declare const RenderJobStatusSchema: z.ZodEnum<["queued", "rendering", "post_processing", "uploading", "completed", "failed", "cancelled", "timed_out"]>;
export type RenderJobStatus = z.infer<typeof RenderJobStatusSchema>;
/**
 * Output format for video renders.
 */
export declare const VideoOutputFormatSchema: z.ZodEnum<["mp4", "webm", "mov", "gif"]>;
export type VideoOutputFormat = z.infer<typeof VideoOutputFormatSchema>;
/**
 * Output format for static renders (images).
 */
export declare const StaticOutputFormatSchema: z.ZodEnum<["png", "jpeg", "webp", "pdf"]>;
export type StaticOutputFormat = z.infer<typeof StaticOutputFormatSchema>;
/**
 * Video codec.
 */
export declare const VideoCodecSchema: z.ZodEnum<["h264", "h265", "vp8", "vp9", "prores"]>;
export type VideoCodec = z.infer<typeof VideoCodecSchema>;
/**
 * Audio codec.
 */
export declare const AudioCodecSchema: z.ZodEnum<["aac", "mp3", "opus", "pcm"]>;
export type AudioCodec = z.infer<typeof AudioCodecSchema>;
/**
 * Aspect ratio presets.
 */
export declare const AspectRatioSchema: z.ZodEnum<["16:9", "9:16", "1:1", "4:3", "4:5", "21:9", "custom"]>;
export type AspectRatio = z.infer<typeof AspectRatioSchema>;
/**
 * Resolution presets.
 */
export declare const ResolutionPresetSchema: z.ZodEnum<["360p", "480p", "720p", "1080p", "1440p", "2160p", "custom"]>;
export type ResolutionPreset = z.infer<typeof ResolutionPresetSchema>;
/**
 * RenderVideoInput - Parameters for triggering a video render.
 */
export declare const RenderVideoInputSchema: z.ZodObject<{
    /** Remotion composition ID. */
    compositionId: z.ZodString;
    /** Input props to pass to the composition. */
    inputProps: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    /** Output format. */
    outputFormat: z.ZodDefault<z.ZodEnum<["mp4", "webm", "mov", "gif"]>>;
    /** Video codec. */
    codec: z.ZodDefault<z.ZodEnum<["h264", "h265", "vp8", "vp9", "prores"]>>;
    /** Audio codec. */
    audioCodec: z.ZodOptional<z.ZodEnum<["aac", "mp3", "opus", "pcm"]>>;
    /** Output width in pixels. */
    width: z.ZodOptional<z.ZodNumber>;
    /** Output height in pixels. */
    height: z.ZodOptional<z.ZodNumber>;
    /** Aspect ratio. */
    aspectRatio: z.ZodOptional<z.ZodEnum<["16:9", "9:16", "1:1", "4:3", "4:5", "21:9", "custom"]>>;
    /** Resolution preset. */
    resolution: z.ZodOptional<z.ZodEnum<["360p", "480p", "720p", "1080p", "1440p", "2160p", "custom"]>>;
    /** Frames per second. */
    fps: z.ZodDefault<z.ZodNumber>;
    /** Duration in frames (overrides composition default). */
    durationInFrames: z.ZodOptional<z.ZodNumber>;
    /** CRF (Constant Rate Factor) for quality. Lower = better quality. */
    crf: z.ZodOptional<z.ZodNumber>;
    /** Video bitrate (e.g., "5M", "10M"). */
    videoBitrate: z.ZodOptional<z.ZodString>;
    /** Audio bitrate (e.g., "128k", "320k"). */
    audioBitrate: z.ZodOptional<z.ZodString>;
    /** Whether to include audio. */
    muted: z.ZodDefault<z.ZodBoolean>;
    /** Audio file URL to overlay. */
    audioUrl: z.ZodOptional<z.ZodString>;
    /** Audio volume multiplier (0-1). */
    audioVolume: z.ZodOptional<z.ZodNumber>;
    /** Start frame (for trimming). */
    startFrame: z.ZodOptional<z.ZodNumber>;
    /** End frame (for trimming). */
    endFrame: z.ZodOptional<z.ZodNumber>;
    /** Number of parallel Lambda functions. */
    concurrency: z.ZodOptional<z.ZodNumber>;
    /** Timeout in milliseconds. */
    timeoutMs: z.ZodDefault<z.ZodNumber>;
    /** Output S3 bucket (if not using default). */
    outputBucket: z.ZodOptional<z.ZodString>;
    /** Output key prefix. */
    outputKeyPrefix: z.ZodOptional<z.ZodString>;
    /** Webhook URL to notify on completion. */
    webhookUrl: z.ZodOptional<z.ZodString>;
    /** Webhook secret for signature verification. */
    webhookSecret: z.ZodOptional<z.ZodString>;
    /** Custom metadata to attach to the job. */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    fps: number;
    codec: "h264" | "h265" | "vp8" | "vp9" | "prores";
    compositionId: string;
    inputProps: Record<string, unknown>;
    outputFormat: "mp4" | "webm" | "mov" | "gif";
    muted: boolean;
    timeoutMs: number;
    width?: number | undefined;
    height?: number | undefined;
    metadata?: Record<string, string> | undefined;
    audioCodec?: "aac" | "mp3" | "opus" | "pcm" | undefined;
    aspectRatio?: "custom" | "16:9" | "9:16" | "1:1" | "4:3" | "4:5" | "21:9" | undefined;
    resolution?: "custom" | "360p" | "480p" | "720p" | "1080p" | "1440p" | "2160p" | undefined;
    durationInFrames?: number | undefined;
    crf?: number | undefined;
    videoBitrate?: string | undefined;
    audioBitrate?: string | undefined;
    audioUrl?: string | undefined;
    audioVolume?: number | undefined;
    startFrame?: number | undefined;
    endFrame?: number | undefined;
    concurrency?: number | undefined;
    outputBucket?: string | undefined;
    outputKeyPrefix?: string | undefined;
    webhookUrl?: string | undefined;
    webhookSecret?: string | undefined;
}, {
    compositionId: string;
    width?: number | undefined;
    height?: number | undefined;
    fps?: number | undefined;
    codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
    metadata?: Record<string, string> | undefined;
    inputProps?: Record<string, unknown> | undefined;
    outputFormat?: "mp4" | "webm" | "mov" | "gif" | undefined;
    audioCodec?: "aac" | "mp3" | "opus" | "pcm" | undefined;
    aspectRatio?: "custom" | "16:9" | "9:16" | "1:1" | "4:3" | "4:5" | "21:9" | undefined;
    resolution?: "custom" | "360p" | "480p" | "720p" | "1080p" | "1440p" | "2160p" | undefined;
    durationInFrames?: number | undefined;
    crf?: number | undefined;
    videoBitrate?: string | undefined;
    audioBitrate?: string | undefined;
    muted?: boolean | undefined;
    audioUrl?: string | undefined;
    audioVolume?: number | undefined;
    startFrame?: number | undefined;
    endFrame?: number | undefined;
    concurrency?: number | undefined;
    timeoutMs?: number | undefined;
    outputBucket?: string | undefined;
    outputKeyPrefix?: string | undefined;
    webhookUrl?: string | undefined;
    webhookSecret?: string | undefined;
}>;
export type RenderVideoInput = z.infer<typeof RenderVideoInputSchema>;
/**
 * RenderStaticInput - Parameters for rendering a static image.
 */
export declare const RenderStaticInputSchema: z.ZodObject<{
    /** Remotion composition ID. */
    compositionId: z.ZodString;
    /** Input props to pass to the composition. */
    inputProps: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    /** Output format. */
    outputFormat: z.ZodDefault<z.ZodEnum<["png", "jpeg", "webp", "pdf"]>>;
    /** Output width in pixels. */
    width: z.ZodOptional<z.ZodNumber>;
    /** Output height in pixels. */
    height: z.ZodOptional<z.ZodNumber>;
    /** Frame number to render. */
    frame: z.ZodDefault<z.ZodNumber>;
    /** JPEG/WebP quality (1-100). */
    quality: z.ZodOptional<z.ZodNumber>;
    /** Scale factor for higher resolution output. */
    scale: z.ZodDefault<z.ZodNumber>;
    /** Transparent background (for PNG/WebP). */
    transparentBackground: z.ZodDefault<z.ZodBoolean>;
    /** Output S3 bucket. */
    outputBucket: z.ZodOptional<z.ZodString>;
    /** Output key prefix. */
    outputKeyPrefix: z.ZodOptional<z.ZodString>;
    /** Timeout in milliseconds. */
    timeoutMs: z.ZodDefault<z.ZodNumber>;
    /** Webhook URL to notify on completion. */
    webhookUrl: z.ZodOptional<z.ZodString>;
    /** Custom metadata. */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    compositionId: string;
    inputProps: Record<string, unknown>;
    outputFormat: "png" | "jpeg" | "webp" | "pdf";
    timeoutMs: number;
    frame: number;
    scale: number;
    transparentBackground: boolean;
    width?: number | undefined;
    height?: number | undefined;
    metadata?: Record<string, string> | undefined;
    outputBucket?: string | undefined;
    outputKeyPrefix?: string | undefined;
    webhookUrl?: string | undefined;
    quality?: number | undefined;
}, {
    compositionId: string;
    width?: number | undefined;
    height?: number | undefined;
    metadata?: Record<string, string> | undefined;
    inputProps?: Record<string, unknown> | undefined;
    outputFormat?: "png" | "jpeg" | "webp" | "pdf" | undefined;
    timeoutMs?: number | undefined;
    outputBucket?: string | undefined;
    outputKeyPrefix?: string | undefined;
    webhookUrl?: string | undefined;
    frame?: number | undefined;
    quality?: number | undefined;
    scale?: number | undefined;
    transparentBackground?: boolean | undefined;
}>;
export type RenderStaticInput = z.infer<typeof RenderStaticInputSchema>;
/**
 * Voice cloning provider.
 */
export declare const VoiceCloneProviderSchema: z.ZodEnum<["elevenlabs", "playht", "resemble", "openai", "custom"]>;
export type VoiceCloneProvider = z.infer<typeof VoiceCloneProviderSchema>;
/**
 * VoiceCloneInput - Parameters for cloning a voice.
 */
export declare const VoiceCloneInputSchema: z.ZodObject<{
    /** Name for the cloned voice. */
    name: z.ZodString;
    /** Description of the voice. */
    description: z.ZodOptional<z.ZodString>;
    /** Voice cloning provider. */
    provider: z.ZodDefault<z.ZodEnum<["elevenlabs", "playht", "resemble", "openai", "custom"]>>;
    /** Audio sample URLs for training (minimum 1, ideally 3+). */
    sampleUrls: z.ZodArray<z.ZodString, "many">;
    /** Labels/tags for the voice. */
    labels: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /** Target language (ISO 639-1). */
    language: z.ZodOptional<z.ZodString>;
    /** Gender hint. */
    gender: z.ZodOptional<z.ZodEnum<["male", "female", "neutral"]>>;
    /** Age range hint. */
    ageRange: z.ZodOptional<z.ZodEnum<["child", "young_adult", "adult", "senior"]>>;
    /** Accent description. */
    accent: z.ZodOptional<z.ZodString>;
    /** Whether to remove background noise from samples. */
    removeBackgroundNoise: z.ZodDefault<z.ZodBoolean>;
    /** Custom metadata. */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    provider: "custom" | "elevenlabs" | "playht" | "resemble" | "openai";
    sampleUrls: string[];
    removeBackgroundNoise: boolean;
    description?: string | undefined;
    metadata?: Record<string, string> | undefined;
    labels?: Record<string, string> | undefined;
    language?: string | undefined;
    gender?: "male" | "female" | "neutral" | undefined;
    ageRange?: "child" | "young_adult" | "adult" | "senior" | undefined;
    accent?: string | undefined;
}, {
    name: string;
    sampleUrls: string[];
    description?: string | undefined;
    metadata?: Record<string, string> | undefined;
    provider?: "custom" | "elevenlabs" | "playht" | "resemble" | "openai" | undefined;
    labels?: Record<string, string> | undefined;
    language?: string | undefined;
    gender?: "male" | "female" | "neutral" | undefined;
    ageRange?: "child" | "young_adult" | "adult" | "senior" | undefined;
    accent?: string | undefined;
    removeBackgroundNoise?: boolean | undefined;
}>;
export type VoiceCloneInput = z.infer<typeof VoiceCloneInputSchema>;
/**
 * Caption style preset.
 */
export declare const CaptionStyleSchema: z.ZodEnum<["default", "karaoke", "subtitle", "word_by_word", "sentence", "tiktok", "hormozi", "custom"]>;
export type CaptionStyle = z.infer<typeof CaptionStyleSchema>;
/**
 * CaptionInput - Parameters for generating captions/subtitles.
 */
export declare const CaptionInputSchema: z.ZodObject<{
    /** URL of the audio or video file to caption. */
    mediaUrl: z.ZodString;
    /** Target language for captions (ISO 639-1). */
    language: z.ZodDefault<z.ZodString>;
    /** Caption style. */
    style: z.ZodDefault<z.ZodEnum<["default", "karaoke", "subtitle", "word_by_word", "sentence", "tiktok", "hormozi", "custom"]>>;
    /** Maximum characters per caption line. */
    maxCharsPerLine: z.ZodDefault<z.ZodNumber>;
    /** Maximum number of lines per caption. */
    maxLines: z.ZodDefault<z.ZodNumber>;
    /** Maximum words per caption segment. */
    maxWordsPerSegment: z.ZodOptional<z.ZodNumber>;
    /** Font family. */
    fontFamily: z.ZodOptional<z.ZodString>;
    /** Font size in pixels. */
    fontSize: z.ZodOptional<z.ZodNumber>;
    /** Font weight. */
    fontWeight: z.ZodOptional<z.ZodEnum<["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"]>>;
    /** Text color (hex). */
    textColor: z.ZodOptional<z.ZodString>;
    /** Background/highlight color (hex). */
    backgroundColor: z.ZodOptional<z.ZodString>;
    /** Active word highlight color (hex). */
    highlightColor: z.ZodOptional<z.ZodString>;
    /** Outline/stroke color (hex). */
    outlineColor: z.ZodOptional<z.ZodString>;
    /** Outline width in pixels. */
    outlineWidth: z.ZodOptional<z.ZodNumber>;
    /** Vertical position (0 = top, 1 = bottom). */
    verticalPosition: z.ZodOptional<z.ZodNumber>;
    /** Whether to translate captions. */
    translate: z.ZodDefault<z.ZodBoolean>;
    /** Target translation language (ISO 639-1). */
    translateTo: z.ZodOptional<z.ZodString>;
    /** Output format for standalone caption files. */
    outputFormat: z.ZodOptional<z.ZodEnum<["srt", "vtt", "ass", "json"]>>;
    /** Custom metadata. */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    language: string;
    mediaUrl: string;
    style: "custom" | "subtitle" | "tiktok" | "default" | "karaoke" | "word_by_word" | "sentence" | "hormozi";
    maxCharsPerLine: number;
    maxLines: number;
    translate: boolean;
    metadata?: Record<string, string> | undefined;
    outputFormat?: "srt" | "vtt" | "ass" | "json" | undefined;
    maxWordsPerSegment?: number | undefined;
    fontFamily?: string | undefined;
    fontSize?: number | undefined;
    fontWeight?: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
    textColor?: string | undefined;
    backgroundColor?: string | undefined;
    highlightColor?: string | undefined;
    outlineColor?: string | undefined;
    outlineWidth?: number | undefined;
    verticalPosition?: number | undefined;
    translateTo?: string | undefined;
}, {
    mediaUrl: string;
    metadata?: Record<string, string> | undefined;
    outputFormat?: "srt" | "vtt" | "ass" | "json" | undefined;
    language?: string | undefined;
    style?: "custom" | "subtitle" | "tiktok" | "default" | "karaoke" | "word_by_word" | "sentence" | "hormozi" | undefined;
    maxCharsPerLine?: number | undefined;
    maxLines?: number | undefined;
    maxWordsPerSegment?: number | undefined;
    fontFamily?: string | undefined;
    fontSize?: number | undefined;
    fontWeight?: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | undefined;
    textColor?: string | undefined;
    backgroundColor?: string | undefined;
    highlightColor?: string | undefined;
    outlineColor?: string | undefined;
    outlineWidth?: number | undefined;
    verticalPosition?: number | undefined;
    translate?: boolean | undefined;
    translateTo?: string | undefined;
}>;
export type CaptionInput = z.infer<typeof CaptionInputSchema>;
/**
 * VeoInput - Parameters for Google Veo AI video generation.
 */
export declare const VeoInputSchema: z.ZodObject<{
    /** Text prompt describing the desired video. */
    prompt: z.ZodString;
    /** Negative prompt (what to avoid). */
    negativePrompt: z.ZodOptional<z.ZodString>;
    /** Reference image URL for image-to-video. */
    referenceImageUrl: z.ZodOptional<z.ZodString>;
    /** Reference video URL for video-to-video. */
    referenceVideoUrl: z.ZodOptional<z.ZodString>;
    /** Duration in seconds. */
    durationSeconds: z.ZodDefault<z.ZodNumber>;
    /** Aspect ratio. */
    aspectRatio: z.ZodDefault<z.ZodEnum<["16:9", "9:16", "1:1", "4:3", "4:5", "21:9", "custom"]>>;
    /** Output resolution. */
    resolution: z.ZodOptional<z.ZodEnum<["360p", "480p", "720p", "1080p", "1440p", "2160p", "custom"]>>;
    /** Number of variations to generate. */
    numVariations: z.ZodDefault<z.ZodNumber>;
    /** Seed for reproducibility. */
    seed: z.ZodOptional<z.ZodNumber>;
    /** Generation guidance scale. */
    guidanceScale: z.ZodOptional<z.ZodNumber>;
    /** Whether to upscale output. */
    upscale: z.ZodDefault<z.ZodBoolean>;
    /** Whether to add slow motion. */
    slowMotion: z.ZodDefault<z.ZodBoolean>;
    /** Model version. */
    modelVersion: z.ZodOptional<z.ZodString>;
    /** Webhook URL. */
    webhookUrl: z.ZodOptional<z.ZodString>;
    /** Custom metadata. */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    aspectRatio: "custom" | "16:9" | "9:16" | "1:1" | "4:3" | "4:5" | "21:9";
    prompt: string;
    durationSeconds: number;
    numVariations: number;
    upscale: boolean;
    slowMotion: boolean;
    metadata?: Record<string, string> | undefined;
    resolution?: "custom" | "360p" | "480p" | "720p" | "1080p" | "1440p" | "2160p" | undefined;
    webhookUrl?: string | undefined;
    negativePrompt?: string | undefined;
    referenceImageUrl?: string | undefined;
    referenceVideoUrl?: string | undefined;
    seed?: number | undefined;
    guidanceScale?: number | undefined;
    modelVersion?: string | undefined;
}, {
    prompt: string;
    metadata?: Record<string, string> | undefined;
    aspectRatio?: "custom" | "16:9" | "9:16" | "1:1" | "4:3" | "4:5" | "21:9" | undefined;
    resolution?: "custom" | "360p" | "480p" | "720p" | "1080p" | "1440p" | "2160p" | undefined;
    webhookUrl?: string | undefined;
    negativePrompt?: string | undefined;
    referenceImageUrl?: string | undefined;
    referenceVideoUrl?: string | undefined;
    durationSeconds?: number | undefined;
    numVariations?: number | undefined;
    seed?: number | undefined;
    guidanceScale?: number | undefined;
    upscale?: boolean | undefined;
    slowMotion?: boolean | undefined;
    modelVersion?: string | undefined;
}>;
export type VeoInput = z.infer<typeof VeoInputSchema>;
/**
 * NanoBananaInput - Parameters for NanoBanana fast image/video generation.
 */
export declare const NanoBananaInputSchema: z.ZodObject<{
    /** Text prompt. */
    prompt: z.ZodString;
    /** Negative prompt. */
    negativePrompt: z.ZodOptional<z.ZodString>;
    /** Model to use. */
    model: z.ZodString;
    /** Number of images to generate. */
    numImages: z.ZodDefault<z.ZodNumber>;
    /** Output width in pixels. */
    width: z.ZodDefault<z.ZodNumber>;
    /** Output height in pixels. */
    height: z.ZodDefault<z.ZodNumber>;
    /** Number of inference steps. */
    steps: z.ZodDefault<z.ZodNumber>;
    /** Guidance scale (CFG). */
    guidanceScale: z.ZodDefault<z.ZodNumber>;
    /** Seed for reproducibility. */
    seed: z.ZodOptional<z.ZodNumber>;
    /** LoRA models to apply. */
    loras: z.ZodOptional<z.ZodArray<z.ZodObject<{
        url: z.ZodString;
        scale: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        url: string;
        scale: number;
    }, {
        url: string;
        scale?: number | undefined;
    }>, "many">>;
    /** Controlnet configuration. */
    controlnet: z.ZodOptional<z.ZodObject<{
        model: z.ZodString;
        imageUrl: z.ZodString;
        conditioningScale: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        imageUrl: string;
        model: string;
        conditioningScale: number;
    }, {
        imageUrl: string;
        model: string;
        conditioningScale?: number | undefined;
    }>>;
    /** Image-to-image reference. */
    initImageUrl: z.ZodOptional<z.ZodString>;
    /** Denoising strength for img2img (0-1). */
    denoisingStrength: z.ZodOptional<z.ZodNumber>;
    /** Scheduler/sampler. */
    scheduler: z.ZodOptional<z.ZodString>;
    /** Output format. */
    outputFormat: z.ZodDefault<z.ZodEnum<["png", "jpeg", "webp"]>>;
    /** JPEG/WebP quality. */
    quality: z.ZodOptional<z.ZodNumber>;
    /** Webhook URL. */
    webhookUrl: z.ZodOptional<z.ZodString>;
    /** Custom metadata. */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
    outputFormat: "png" | "jpeg" | "webp";
    prompt: string;
    guidanceScale: number;
    model: string;
    numImages: number;
    steps: number;
    metadata?: Record<string, string> | undefined;
    webhookUrl?: string | undefined;
    quality?: number | undefined;
    negativePrompt?: string | undefined;
    seed?: number | undefined;
    loras?: {
        url: string;
        scale: number;
    }[] | undefined;
    controlnet?: {
        imageUrl: string;
        model: string;
        conditioningScale: number;
    } | undefined;
    initImageUrl?: string | undefined;
    denoisingStrength?: number | undefined;
    scheduler?: string | undefined;
}, {
    prompt: string;
    model: string;
    width?: number | undefined;
    height?: number | undefined;
    metadata?: Record<string, string> | undefined;
    outputFormat?: "png" | "jpeg" | "webp" | undefined;
    webhookUrl?: string | undefined;
    quality?: number | undefined;
    negativePrompt?: string | undefined;
    seed?: number | undefined;
    guidanceScale?: number | undefined;
    numImages?: number | undefined;
    steps?: number | undefined;
    loras?: {
        url: string;
        scale?: number | undefined;
    }[] | undefined;
    controlnet?: {
        imageUrl: string;
        model: string;
        conditioningScale?: number | undefined;
    } | undefined;
    initImageUrl?: string | undefined;
    denoisingStrength?: number | undefined;
    scheduler?: string | undefined;
}>;
export type NanoBananaInput = z.infer<typeof NanoBananaInputSchema>;
/**
 * Transition style for before/after comparison.
 */
export declare const BeforeAfterTransitionSchema: z.ZodEnum<["slider", "wipe_left", "wipe_right", "wipe_up", "wipe_down", "fade", "split", "circle_reveal", "diagonal", "custom"]>;
export type BeforeAfterTransition = z.infer<typeof BeforeAfterTransitionSchema>;
/**
 * BeforeAfterInput - Parameters for creating before/after comparison content.
 */
export declare const BeforeAfterInputSchema: z.ZodObject<{
    /** URL of the "before" media (image or video). */
    beforeUrl: z.ZodString;
    /** URL of the "after" media (image or video). */
    afterUrl: z.ZodString;
    /** Label for the "before" side. */
    beforeLabel: z.ZodDefault<z.ZodString>;
    /** Label for the "after" side. */
    afterLabel: z.ZodDefault<z.ZodString>;
    /** Transition style. */
    transition: z.ZodDefault<z.ZodEnum<["slider", "wipe_left", "wipe_right", "wipe_up", "wipe_down", "fade", "split", "circle_reveal", "diagonal", "custom"]>>;
    /** Transition duration in milliseconds. */
    transitionDurationMs: z.ZodDefault<z.ZodNumber>;
    /** Hold duration on each side in milliseconds. */
    holdDurationMs: z.ZodDefault<z.ZodNumber>;
    /** Output type. */
    outputType: z.ZodDefault<z.ZodEnum<["video", "image", "gif"]>>;
    /** Output width. */
    width: z.ZodOptional<z.ZodNumber>;
    /** Output height. */
    height: z.ZodOptional<z.ZodNumber>;
    /** FPS for video output. */
    fps: z.ZodDefault<z.ZodNumber>;
    /** Whether to loop the animation. */
    loop: z.ZodDefault<z.ZodBoolean>;
    /** Number of loops (0 = infinite). */
    loopCount: z.ZodDefault<z.ZodNumber>;
    /** Font family for labels. */
    labelFontFamily: z.ZodOptional<z.ZodString>;
    /** Font size for labels. */
    labelFontSize: z.ZodOptional<z.ZodNumber>;
    /** Label text color (hex). */
    labelColor: z.ZodOptional<z.ZodString>;
    /** Divider/slider color (hex). */
    dividerColor: z.ZodOptional<z.ZodString>;
    /** Divider width in pixels. */
    dividerWidth: z.ZodDefault<z.ZodNumber>;
    /** Webhook URL. */
    webhookUrl: z.ZodOptional<z.ZodString>;
    /** Custom metadata. */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    fps: number;
    beforeUrl: string;
    afterUrl: string;
    beforeLabel: string;
    afterLabel: string;
    transition: "custom" | "slider" | "wipe_left" | "wipe_right" | "wipe_up" | "wipe_down" | "fade" | "split" | "circle_reveal" | "diagonal";
    transitionDurationMs: number;
    holdDurationMs: number;
    outputType: "video" | "image" | "gif";
    loop: boolean;
    loopCount: number;
    dividerWidth: number;
    width?: number | undefined;
    height?: number | undefined;
    metadata?: Record<string, string> | undefined;
    webhookUrl?: string | undefined;
    labelFontFamily?: string | undefined;
    labelFontSize?: number | undefined;
    labelColor?: string | undefined;
    dividerColor?: string | undefined;
}, {
    beforeUrl: string;
    afterUrl: string;
    width?: number | undefined;
    height?: number | undefined;
    fps?: number | undefined;
    metadata?: Record<string, string> | undefined;
    webhookUrl?: string | undefined;
    beforeLabel?: string | undefined;
    afterLabel?: string | undefined;
    transition?: "custom" | "slider" | "wipe_left" | "wipe_right" | "wipe_up" | "wipe_down" | "fade" | "split" | "circle_reveal" | "diagonal" | undefined;
    transitionDurationMs?: number | undefined;
    holdDurationMs?: number | undefined;
    outputType?: "video" | "image" | "gif" | undefined;
    loop?: boolean | undefined;
    loopCount?: number | undefined;
    labelFontFamily?: string | undefined;
    labelFontSize?: number | undefined;
    labelColor?: string | undefined;
    dividerColor?: string | undefined;
    dividerWidth?: number | undefined;
}>;
export type BeforeAfterInput = z.infer<typeof BeforeAfterInputSchema>;
/**
 * Render type discriminator.
 */
export declare const RenderTypeSchema: z.ZodEnum<["video", "static", "voice_clone", "caption", "veo", "nano_banana", "before_after"]>;
export type RenderType = z.infer<typeof RenderTypeSchema>;
/**
 * RenderJob - Represents a render job and its current state.
 */
export declare const RenderJobSchema: z.ZodObject<{
    /** Unique render job identifier (UUID v4). */
    id: z.ZodString;
    /** The user who initiated this render. */
    userId: z.ZodString;
    /** Render type. */
    type: z.ZodEnum<["video", "static", "voice_clone", "caption", "veo", "nano_banana", "before_after"]>;
    /** Current job status. */
    status: z.ZodDefault<z.ZodEnum<["queued", "rendering", "post_processing", "uploading", "completed", "failed", "cancelled", "timed_out"]>>;
    /** Progress percentage (0-100). */
    progress: z.ZodDefault<z.ZodNumber>;
    /** Composition ID (for Remotion renders). */
    compositionId: z.ZodOptional<z.ZodString>;
    /** Input parameters (the original request). */
    input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    /** Output file URL (populated on completion). */
    outputUrl: z.ZodOptional<z.ZodString>;
    /** Output file size in bytes. */
    outputSizeBytes: z.ZodOptional<z.ZodNumber>;
    /** Output duration in milliseconds (for video/audio). */
    outputDurationMs: z.ZodOptional<z.ZodNumber>;
    /** Output dimensions. */
    outputWidth: z.ZodOptional<z.ZodNumber>;
    outputHeight: z.ZodOptional<z.ZodNumber>;
    /** Thumbnail URL. */
    thumbnailUrl: z.ZodOptional<z.ZodString>;
    /** CDN URL for the output. */
    cdnUrl: z.ZodOptional<z.ZodString>;
    /** S3/storage bucket. */
    storageBucket: z.ZodOptional<z.ZodString>;
    /** S3/storage key. */
    storageKey: z.ZodOptional<z.ZodString>;
    /** Error message (if failed). */
    errorMessage: z.ZodOptional<z.ZodString>;
    /** Error code. */
    errorCode: z.ZodOptional<z.ZodString>;
    /** Number of retry attempts. */
    retryCount: z.ZodDefault<z.ZodNumber>;
    /** Maximum allowed retries. */
    maxRetries: z.ZodDefault<z.ZodNumber>;
    /** Rendering duration in milliseconds. */
    renderDurationMs: z.ZodOptional<z.ZodNumber>;
    /** Cost in credits consumed. */
    creditsConsumed: z.ZodOptional<z.ZodNumber>;
    /** Lambda/function invocation ID (for serverless renders). */
    invocationId: z.ZodOptional<z.ZodString>;
    /** Webhook URL to notify. */
    webhookUrl: z.ZodOptional<z.ZodString>;
    /** Whether webhook was successfully delivered. */
    webhookDelivered: z.ZodOptional<z.ZodBoolean>;
    /** Custom metadata. */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    /** ISO 8601 timestamp when the job was queued. */
    queuedAt: z.ZodString;
    /** ISO 8601 timestamp when rendering started. */
    startedAt: z.ZodOptional<z.ZodString>;
    /** ISO 8601 timestamp when the job completed. */
    completedAt: z.ZodOptional<z.ZodString>;
    /** ISO 8601 timestamp of creation. */
    createdAt: z.ZodString;
    /** ISO 8601 timestamp of last update. */
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "video" | "voice_clone" | "static" | "caption" | "veo" | "nano_banana" | "before_after";
    status: "uploading" | "failed" | "queued" | "rendering" | "post_processing" | "completed" | "cancelled" | "timed_out";
    id: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    progress: number;
    input: Record<string, unknown>;
    retryCount: number;
    maxRetries: number;
    queuedAt: string;
    storageBucket?: string | undefined;
    storageKey?: string | undefined;
    cdnUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    metadata?: Record<string, string> | undefined;
    compositionId?: string | undefined;
    webhookUrl?: string | undefined;
    outputUrl?: string | undefined;
    outputSizeBytes?: number | undefined;
    outputDurationMs?: number | undefined;
    outputWidth?: number | undefined;
    outputHeight?: number | undefined;
    errorMessage?: string | undefined;
    errorCode?: string | undefined;
    renderDurationMs?: number | undefined;
    creditsConsumed?: number | undefined;
    invocationId?: string | undefined;
    webhookDelivered?: boolean | undefined;
    startedAt?: string | undefined;
    completedAt?: string | undefined;
}, {
    type: "video" | "voice_clone" | "static" | "caption" | "veo" | "nano_banana" | "before_after";
    id: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    input: Record<string, unknown>;
    queuedAt: string;
    status?: "uploading" | "failed" | "queued" | "rendering" | "post_processing" | "completed" | "cancelled" | "timed_out" | undefined;
    storageBucket?: string | undefined;
    storageKey?: string | undefined;
    cdnUrl?: string | undefined;
    thumbnailUrl?: string | undefined;
    metadata?: Record<string, string> | undefined;
    compositionId?: string | undefined;
    webhookUrl?: string | undefined;
    progress?: number | undefined;
    outputUrl?: string | undefined;
    outputSizeBytes?: number | undefined;
    outputDurationMs?: number | undefined;
    outputWidth?: number | undefined;
    outputHeight?: number | undefined;
    errorMessage?: string | undefined;
    errorCode?: string | undefined;
    retryCount?: number | undefined;
    maxRetries?: number | undefined;
    renderDurationMs?: number | undefined;
    creditsConsumed?: number | undefined;
    invocationId?: string | undefined;
    webhookDelivered?: boolean | undefined;
    startedAt?: string | undefined;
    completedAt?: string | undefined;
}>;
export type RenderJob = z.infer<typeof RenderJobSchema>;
//# sourceMappingURL=remotion.d.ts.map