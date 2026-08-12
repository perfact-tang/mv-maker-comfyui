
import LTX23_V2I_WORKFLOW_JSON from './video_ltx2_3_ia2v.json';

export const SMOOTH_V2_WORKFLOW = {
  "7": {
    "inputs": {
      "text": "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走, censored, mosaic censoring, bar censor, pixelated, glowing, bloom, blurry, day, out of focus, low detail, bad anatomy, ugly, overexposed, underexposed, distorted face, extra limbs, cartoonish, 3d render artifacts, duplicate people, unnatural lighting, bad composition, missing shadows, low resolution, poorly textured, glitch, noise, grain, static, motionless, still frame, overall grayish, worst quality, low quality, JPEG compression artifacts, subtitles, stylized, artwork, painting, illustration, cluttered background, many people in background, three legs, walking backward, zoom out, zoom in, mouth speaking, moving mouth, talking, speaking, mute speaking, unnatural skin tone, discolored eyelid, red eyelids, red upper eyelids, no red eyeshadow, closed eyes, no wide-open innocent eyes, poorly drawn hands, extra fingers, fused fingers, poorly drawn face, deformed, disfigured, malformed limbs, thighs, fog, mist, voluminous eyelashes, blush,",
      "clip": [
        "38",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "Negative"
    }
  },
  "8": {
    "inputs": {
      "samples": [
        "73",
        0
      ],
      "vae": [
        "39",
        0
      ]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE解码"
    }
  },
  "38": {
    "inputs": {
      "clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
      "type": "wan",
      "device": "cpu"
    },
    "class_type": "CLIPLoader",
    "_meta": {
      "title": "加载CLIP"
    }
  },
  "39": {
    "inputs": {
      "vae_name": "wan_2.1_vae.safetensors"
    },
    "class_type": "VAELoader",
    "_meta": {
      "title": "加载VAE"
    }
  },
  "50": {
    "inputs": {
      "width": [
        "64",
        1
      ],
      "height": [
        "64",
        2
      ],
      "length": 81,
      "batch_size": 1,
      "positive": [
        "90",
        0
      ],
      "negative": [
        "7",
        0
      ],
      "vae": [
        "39",
        0
      ],
      "clip_vision_output": [
        "107",
        0
      ],
      "start_image": [
        "64",
        0
      ]
    },
    "class_type": "WanImageToVideo",
    "_meta": {
      "title": "图像到视频（Wan）"
    }
  },
  "52": {
    "inputs": {
      "image": "iShot_mv-maker-comfyui_21.28.27.png"
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "加载图像"
    }
  },
  "54": {
    "inputs": {
      "shift": 8.000000000000002,
      "model": [
        "135",
        0
      ]
    },
    "class_type": "ModelSamplingSD3",
    "_meta": {
      "title": "采样算法（SD3）"
    }
  },
  "55": {
    "inputs": {
      "shift": 8.000000000000002,
      "model": [
        "136",
        0
      ]
    },
    "class_type": "ModelSamplingSD3",
    "_meta": {
      "title": "采样算法（SD3）"
    }
  },
  "57": {
    "inputs": {
      "add_noise": "enable",
      "noise_seed": [
        "82",
        0
      ],
      "steps": 10,
      "cfg": 1.3,
      "sampler_name": "euler_ancestral",
      "scheduler": "simple",
      "start_at_step": 0,
      "end_at_step": 3,
      "return_with_leftover_noise": "enable",
      "model": [
        "54",
        0
      ],
      "positive": [
        "50",
        0
      ],
      "negative": [
        "50",
        1
      ],
      "latent_image": [
        "50",
        2
      ]
    },
    "class_type": "KSamplerAdvanced",
    "_meta": {
      "title": "K采样器（高级）"
    }
  },
  "58": {
    "inputs": {
      "add_noise": "disable",
      "noise_seed": 0,
      "steps": 10,
      "cfg": 1.3,
      "sampler_name": "euler_ancestral",
      "scheduler": "simple",
      "start_at_step": 3,
      "end_at_step": 10000,
      "return_with_leftover_noise": "disable",
      "model": [
        "55",
        0
      ],
      "positive": [
        "50",
        0
      ],
      "negative": [
        "50",
        1
      ],
      "latent_image": [
        "57",
        0
      ]
    },
    "class_type": "KSamplerAdvanced",
    "_meta": {
      "title": "K采样器（高级）"
    }
  },
  "63": {
    "inputs": {
      "frame_rate": 16,
      "loop_count": 0,
      "filename_prefix": "mv-maker-comfyui/wan22_",
      "format": "video/h264-mp4",
      "pix_fmt": "yuv420p",
      "crf": 19,
      "save_metadata": false,
      "trim_to_audio": false,
      "pingpong": false,
      "save_output": false,
      "images": [
        "8",
        0
      ]
    },
    "class_type": "VHS_VideoCombine",
    "_meta": {
      "title": "Video Combine 🎥🅥🅗🅢"
    }
  },
  "64": {
    "inputs": {
      "width": [
        "97",
        0
      ],
      "height": [
        "97",
        1
      ],
      "upscale_method": "lanczos",
      "keep_proportion": "resize",
      "pad_color": "0, 0, 0",
      "crop_position": "center",
      "divisible_by": 16,
      "device": "cpu",
      "image": [
        "52",
        0
      ]
    },
    "class_type": "ImageResizeKJv2",
    "_meta": {
      "title": "Resize Image v2"
    }
  },
  "73": {
    "inputs": {
      "anything": [
        "58",
        0
      ]
    },
    "class_type": "easy cleanGpuUsed",
    "_meta": {
      "title": "清理显存占用"
    }
  },
  "74": {
    "inputs": {
      "upscale_method": "lanczos",
      "scale_by": 2.0000000000000004,
      "image": [
        "8",
        0
      ]
    },
    "class_type": "ImageScaleBy",
    "_meta": {
      "title": "缩放图像（比例）"
    }
  },
  "75": {
    "inputs": {
      "ckpt_name": "rife49.pth",
      "clear_cache_after_n_frames": 10,
      "multiplier": 2,
      "fast_mode": false,
      "ensemble": true,
      "scale_factor": 1,
      "frames": [
        "76",
        0
      ]
    },
    "class_type": "RIFE VFI",
    "_meta": {
      "title": "Frame Interpolation (RIFE)"
    }
  },
  "76": {
    "inputs": {
      "anything": [
        "74",
        0
      ]
    },
    "class_type": "easy cleanGpuUsed",
    "_meta": {
      "title": "清理显存占用"
    }
  },
  "77": {
    "inputs": {
      "frame_rate": 32,
      "loop_count": 0,
      "filename_prefix": "Video/mv-maker-comfyui/213353",
      "format": "video/h264-mp4",
      "pix_fmt": "yuv420p",
      "crf": 15,
      "save_metadata": true,
      "trim_to_audio": false,
      "pingpong": false,
      "save_output": true,
      "images": [
        "75",
        0
      ]
    },
    "class_type": "VHS_VideoCombine",
    "_meta": {
      "title": "Video Combine 🎥🅥🅗🅢"
    }
  },
  "78": {
    "inputs": {
      "from_direction": "end",
      "count": 1,
      "image": [
        "8",
        0
      ]
    },
    "class_type": "Pick From Batch (mtb)",
    "_meta": {
      "title": "Pick From Batch (mtb)"
    }
  },
  "79": {
    "inputs": {
      "upscale_method": "lanczos",
      "scale_by": 2.0000000000000004,
      "image": [
        "112",
        0
      ]
    },
    "class_type": "ImageScaleBy",
    "_meta": {
      "title": "缩放图像（比例）"
    }
  },
  "80": {
    "inputs": {
      "images": [
        "79",
        0
      ]
    },
    "class_type": "PreviewImage",
    "_meta": {
      "title": "Last Frame Preview"
    }
  },
  "81": {
    "inputs": {
      "filename_prefix": "Video/mv-maker-comfyui/213353LASTFRAME",
      "images": [
        "79",
        0
      ]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "保存图像"
    }
  },
  "82": {
    "inputs": {
      "seed": 803707655382886
    },
    "class_type": "Seed (rgthree)",
    "_meta": {
      "title": "Seed (rgthree)"
    }
  },
  "84": {
    "inputs": {
      "string_a": "",
      "string_b": [
        "88",
        0
      ],
      "delimiter": ""
    },
    "class_type": "StringConcatenate",
    "_meta": {
      "title": "连接"
    }
  },
  "88": {
    "inputs": {
      "value": "Slow zoom in, the woman hums softly with subtle head movement, rain falling heavily on the glass, neon lights flickering in the background, soft focus shifts, high quality."
    },
    "class_type": "PrimitiveStringMultiline",
    "_meta": {
      "title": "Positive"
    }
  },
  "89": {
    "inputs": {
      "text": "Slow zoom in, the woman hums softly with subtle head movement, rain falling heavily on the glass, neon lights flickering in the background, soft focus shifts, high quality.",
      "anything": [
        "84",
        0
      ]
    },
    "class_type": "easy showAnything",
    "_meta": {
      "title": "Final prompt preview"
    }
  },
  "90": {
    "inputs": {
      "text": [
        "84",
        0
      ],
      "clip": [
        "38",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "Positive encode"
    }
  },
  "97": {
    "inputs": {
      "Xi": 600,
      "Xf": 600,
      "Yi": 900,
      "Yf": 900,
      "isfloatX": 0,
      "isfloatY": 0
    },
    "class_type": "mxSlider2D",
    "_meta": {
      "title": "VIDEO Width x Height"
    }
  },
  "107": {
    "inputs": {
      "crop": "none",
      "clip_vision": [
        "108",
        0
      ],
      "image": [
        "52",
        0
      ]
    },
    "class_type": "CLIPVisionEncode",
    "_meta": {
      "title": "CLIP视觉编码"
    }
  },
  "108": {
    "inputs": {
      "clip_name": "clip_vision_h.safetensors"
    },
    "class_type": "CLIPVisionLoader",
    "_meta": {
      "title": "加载CLIP视觉"
    }
  },
  "112": {
    "inputs": {
      "method": "mkl",
      "strength": 0.4000000000000001,
      "multithread": true,
      "image_ref": [
        "52",
        0
      ],
      "image_target": [
        "78",
        0
      ]
    },
    "class_type": "ColorMatch",
    "_meta": {
      "title": "Color Match"
    }
  },
  "132": {
    "inputs": {
      "unet_name": "smoothMixWan2214BI2V_i2vV20High.safetensors",
      "weight_dtype": "default"
    },
    "class_type": "UNETLoader",
    "_meta": {
      "title": "UNet加载器"
    }
  },
  "133": {
    "inputs": {
      "unet_name": "smoothMixWan2214BI2V_i2vV20Low.safetensors",
      "weight_dtype": "default"
    },
    "class_type": "UNETLoader",
    "_meta": {
      "title": "UNet加载器"
    }
  },
  "135": {
    "inputs": {
      "PowerLoraLoaderHeaderWidget": {
        "type": "PowerLoraLoaderHeaderWidget"
      },
      "lora_1": {
        "on": true,
        "lora": "lightx2v_I2V_14B_480p_cfg_step_distill_rank128_bf16.safetensors",
        "strength": 3
      },
      "lora_2": {
        "on": false,
        "lora": "SmoothXXXAnimation_High.safetensors",
        "strength": 1
      },
      "➕ Add Lora": "",
      "model": [
        "132",
        0
      ]
    },
    "class_type": "Power Lora Loader (rgthree)",
    "_meta": {
      "title": "Power Lora Loader (HIGH)"
    }
  },
  "136": {
    "inputs": {
      "PowerLoraLoaderHeaderWidget": {
        "type": "PowerLoraLoaderHeaderWidget"
      },
      "lora_1": {
        "on": true,
        "lora": "lightx2v_I2V_14B_480p_cfg_step_distill_rank128_bf16.safetensors",
        "strength": 1.5
      },
      "lora_2": {
        "on": false,
        "lora": "SmoothXXXAnimation_Low.safetensors",
        "strength": 1
      },
      "➕ Add Lora": "",
      "model": [
        "133",
        0
      ]
    },
    "class_type": "Power Lora Loader (rgthree)",
    "_meta": {
      "title": "Power Lora Loader (LOW)"
    }
  }
};

export const SMOOTH_V1_WORKFLOW = { 
   "7": { 
     "inputs": { 
       "text": "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走, censored, mosaic censoring, bar censor, pixelated, glowing, bloom, blurry, day, out of focus, low detail, bad anatomy, ugly, overexposed, underexposed, distorted face, extra limbs, cartoonish, 3d render artifacts, duplicate people, unnatural lighting, bad composition, missing shadows, low resolution, poorly textured, glitch, noise, grain, static, motionless, still frame, overall grayish, worst quality, low quality, JPEG compression artifacts, subtitles, stylized, artwork, painting, illustration, cluttered background, many people in background, three legs, walking backward, zoom out, zoom in, mouth speaking, moving mouth, talking, speaking, mute speaking, unnatural skin tone, discolored eyelid, red eyelids, red upper eyelids, no red eyeshadow, closed eyes, no wide-open innocent eyes, poorly drawn hands, extra fingers, fused fingers, poorly drawn face, deformed, disfigured, malformed limbs, thighs, fog, mist, voluminous eyelashes, blush,", 
       "clip": [ 
         "38", 
         0 
       ] 
     }, 
     "class_type": "CLIPTextEncode", 
     "_meta": { 
       "title": "Negative" 
     } 
   }, 
   "8": { 
     "inputs": { 
       "samples": [ 
         "73", 
         0 
       ], 
       "vae": [ 
         "39", 
         0 
       ] 
     }, 
     "class_type": "VAEDecode", 
     "_meta": { 
       "title": "VAE解码" 
     } 
   }, 
   "38": { 
     "inputs": { 
       "clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors", 
       "type": "wan", 
       "device": "cpu" 
     }, 
     "class_type": "CLIPLoader", 
     "_meta": { 
       "title": "加载CLIP" 
     } 
   }, 
   "39": { 
     "inputs": { 
       "vae_name": "wan_2.1_vae.safetensors" 
     }, 
     "class_type": "VAELoader", 
     "_meta": { 
       "title": "加载VAE" 
     } 
   }, 
   "50": { 
     "inputs": { 
       "width": [ 
         "64", 
         1 
       ], 
       "height": [ 
         "64", 
         2 
       ], 
       "length": 81, 
       "batch_size": 1, 
       "positive": [ 
         "90", 
         0 
       ], 
       "negative": [ 
         "7", 
         0 
       ], 
       "vae": [ 
         "39", 
         0 
       ], 
       "clip_vision_output": [ 
         "107", 
         0 
       ], 
       "start_image": [ 
         "64", 
         0 
       ] 
     }, 
     "class_type": "WanImageToVideo", 
     "_meta": { 
       "title": "图像到视频（Wan）" 
     } 
   }, 
   "52": { 
     "inputs": { 
       "image": "IMG.png" 
     }, 
     "class_type": "LoadImage", 
     "_meta": { 
       "title": "加载图像" 
     } 
   }, 
   "54": { 
     "inputs": { 
       "shift": 8.000000000000002, 
       "model": [ 
         "109", 
         0 
       ] 
     }, 
     "class_type": "ModelSamplingSD3", 
     "_meta": { 
       "title": "采样算法（SD3）" 
     } 
   }, 
   "55": { 
     "inputs": { 
       "shift": 8.000000000000002, 
       "model": [ 
         "110", 
         0 
       ] 
     }, 
     "class_type": "ModelSamplingSD3", 
     "_meta": { 
       "title": "采样算法（SD3）" 
     } 
   }, 
   "57": { 
     "inputs": { 
       "add_noise": "enable", 
       "noise_seed": [ 
         "82", 
         0 
       ], 
       "steps": 10, 
       "cfg": 1.3, 
       "sampler_name": "euler_ancestral", 
       "scheduler": "simple", 
       "start_at_step": 0, 
       "end_at_step": 3, 
       "return_with_leftover_noise": "enable", 
       "model": [ 
         "54", 
         0 
       ], 
       "positive": [ 
         "50", 
         0 
       ], 
       "negative": [ 
         "50", 
         1 
       ], 
       "latent_image": [ 
         "50", 
         2 
       ] 
     }, 
     "class_type": "KSamplerAdvanced", 
     "_meta": { 
       "title": "K采样器（高级）" 
     } 
   }, 
   "58": { 
     "inputs": { 
       "add_noise": "disable", 
       "noise_seed": 0, 
       "steps": 10, 
       "cfg": 1.3, 
       "sampler_name": "euler_ancestral", 
       "scheduler": "simple", 
       "start_at_step": 3, 
       "end_at_step": 10000, 
       "return_with_leftover_noise": "disable", 
       "model": [ 
         "55", 
         0 
       ], 
       "positive": [ 
         "50", 
         0 
       ], 
       "negative": [ 
         "50", 
         1 
       ], 
       "latent_image": [ 
         "57", 
         0 
       ] 
     }, 
     "class_type": "KSamplerAdvanced", 
     "_meta": { 
       "title": "K采样器（高级）" 
     } 
   }, 
   "63": { 
     "inputs": { 
       "frame_rate": 16, 
       "loop_count": 0, 
       "filename_prefix": "mv-maker-comfyui/wan22_",
       "format": "video/h264-mp4", 
       "pix_fmt": "yuv420p", 
       "crf": 19, 
       "save_metadata": false, 
       "trim_to_audio": false, 
       "pingpong": false, 
       "save_output": false, 
       "images": [ 
         "8", 
         0 
       ] 
     }, 
     "class_type": "VHS_VideoCombine", 
     "_meta": { 
       "title": "Video Combine 🎥🅥🅗🅢" 
     } 
   }, 
   "64": { 
     "inputs": { 
       "width": [ 
         "97", 
         0 
       ], 
       "height": [ 
         "97", 
         1 
       ], 
       "upscale_method": "lanczos", 
       "keep_proportion": "resize", 
       "pad_color": "0, 0, 0", 
       "crop_position": "center", 
       "divisible_by": 16, 
       "device": "cpu", 
       "image": [ 
         "52", 
         0 
       ] 
     }, 
     "class_type": "ImageResizeKJv2", 
     "_meta": { 
       "title": "Resize Image v2" 
     } 
   }, 
   "73": { 
     "inputs": { 
       "anything": [ 
         "58", 
         0 
       ] 
     }, 
     "class_type": "easy cleanGpuUsed", 
     "_meta": { 
       "title": "清理显存占用" 
     } 
   }, 
   "74": { 
     "inputs": { 
       "upscale_method": "lanczos", 
       "scale_by": 2.0000000000000004, 
       "image": [ 
         "8", 
         0 
       ] 
     }, 
     "class_type": "ImageScaleBy", 
     "_meta": { 
       "title": "缩放图像（比例）" 
     } 
   }, 
   "75": { 
     "inputs": { 
       "ckpt_name": "rife49.pth", 
       "clear_cache_after_n_frames": 10, 
       "multiplier": 2, 
       "fast_mode": false, 
       "ensemble": true, 
       "scale_factor": 1, 
       "frames": [ 
         "76", 
         0 
       ] 
     }, 
     "class_type": "RIFE VFI", 
     "_meta": { 
       "title": "Frame Interpolation (RIFE)" 
     } 
   }, 
   "76": { 
     "inputs": { 
       "anything": [ 
         "74", 
         0 
       ] 
     }, 
     "class_type": "easy cleanGpuUsed", 
     "_meta": { 
       "title": "清理显存占用" 
     } 
   }, 
   "77": { 
     "inputs": { 
       "frame_rate": 32, 
       "loop_count": 0, 
       "filename_prefix": "Video/mv-maker-comfyui/231104",
       "format": "video/h264-mp4", 
       "pix_fmt": "yuv420p", 
       "crf": 15, 
       "save_metadata": true, 
       "trim_to_audio": false, 
       "pingpong": false, 
       "save_output": true, 
       "images": [ 
         "75", 
         0 
       ] 
     }, 
     "class_type": "VHS_VideoCombine", 
     "_meta": { 
       "title": "Video Combine 🎥🅥🅗🅢" 
     } 
   }, 
   "78": { 
     "inputs": { 
       "from_direction": "end", 
       "count": 1, 
       "image": [ 
         "8", 
         0 
       ] 
     }, 
     "class_type": "Pick From Batch (mtb)", 
     "_meta": { 
       "title": "Pick From Batch (mtb)" 
     } 
   }, 
   "79": { 
     "inputs": { 
       "upscale_method": "lanczos", 
       "scale_by": 2.0000000000000004, 
       "image": [ 
         "112", 
         0 
       ] 
     }, 
     "class_type": "ImageScaleBy", 
     "_meta": { 
       "title": "缩放图像（比例）" 
     } 
   }, 
   "80": { 
     "inputs": { 
       "images": [ 
         "79", 
         0 
       ] 
     }, 
     "class_type": "PreviewImage", 
     "_meta": { 
       "title": "Last Frame Preview" 
     } 
   }, 
   "81": { 
     "inputs": { 
       "filename_prefix": "Video/mv-maker-comfyui/213353LASTFRAME",
       "images": [ 
         "79", 
         0 
       ] 
     }, 
     "class_type": "SaveImage", 
     "_meta": { 
       "title": "保存图像" 
     } 
   }, 
   "82": { 
     "inputs": { 
       "seed": 803707655382886 
     }, 
     "class_type": "Seed (rgthree)", 
     "_meta": { 
       "title": "Seed (rgthree)" 
     } 
   }, 
   "84": { 
     "inputs": { 
       "string_a": "", 
       "string_b": [ 
         "88", 
         0 
       ], 
       "delimiter": "" 
     }, 
     "class_type": "StringConcatenate", 
     "_meta": { 
       "title": "连接" 
     } 
   }, 
   "88": { 
     "inputs": { 
       "value": "Slow camera zoom in, the woman lies still, snow falling gently, mist swirling, dreamlike atmosphere, high quality, steadycam." 
     }, 
     "class_type": "PrimitiveStringMultiline", 
     "_meta": { 
       "title": "Positive" 
     } 
   }, 
   "89": { 
     "inputs": { 
       "text": "Slow camera zoom in, the woman lies still, snow falling gently, mist swirling, dreamlike atmosphere, high quality, steadycam.", 
       "anything": [ 
         "84", 
         0 
       ] 
     }, 
     "class_type": "easy showAnything", 
     "_meta": { 
       "title": "Final prompt preview" 
     } 
   }, 
   "90": { 
     "inputs": { 
       "text": [ 
         "84", 
         0 
       ], 
       "clip": [ 
         "38", 
         0 
       ] 
     }, 
     "class_type": "CLIPTextEncode", 
     "_meta": { 
       "title": "Positive encode" 
     } 
   }, 
   "97": { 
     "inputs": { 
       "Xi": 480, 
       "Xf": 480, 
       "Yi": 720, 
       "Yf": 720, 
       "isfloatX": 0, 
       "isfloatY": 0 
     }, 
     "class_type": "mxSlider2D", 
     "_meta": { 
       "title": "VIDEO Width x Height" 
     } 
   }, 
   "107": { 
     "inputs": { 
       "crop": "none", 
       "clip_vision": [ 
         "108", 
         0 
       ], 
       "image": [ 
         "52", 
         0 
       ] 
     }, 
     "class_type": "CLIPVisionEncode", 
     "_meta": { 
       "title": "CLIP视觉编码" 
     } 
   }, 
   "108": { 
     "inputs": { 
       "clip_name": "clip_vision_h.safetensors" 
     }, 
     "class_type": "CLIPVisionLoader", 
     "_meta": { 
       "title": "加载CLIP视觉" 
     } 
   }, 
   "109": { 
     "inputs": { 
       "PowerLoraLoaderHeaderWidget": { 
         "type": "PowerLoraLoaderHeaderWidget" 
       }, 
       "lora_1": { 
         "on": false, 
         "lora": "SmoothXXXAnimation_High.safetensors", 
         "strength": 1 
       }, 
       "➕ Add Lora": "", 
       "model": [ 
         "131", 
         0 
       ] 
     }, 
     "class_type": "Power Lora Loader (rgthree)", 
     "_meta": { 
       "title": "HIGH LORA LOADER" 
     } 
   }, 
   "110": { 
     "inputs": { 
       "PowerLoraLoaderHeaderWidget": { 
         "type": "PowerLoraLoaderHeaderWidget" 
       }, 
       "lora_1": { 
         "on": false, 
         "lora": "SmoothXXXAnimation_Low.safetensors", 
         "strength": 1 
       }, 
       "➕ Add Lora": "", 
       "model": [ 
         "128", 
         0 
       ] 
     }, 
     "class_type": "Power Lora Loader (rgthree)", 
     "_meta": { 
       "title": "LOW LORA LOADER" 
     } 
   }, 
   "112": { 
     "inputs": { 
       "method": "mkl", 
       "strength": 0.4000000000000001, 
       "multithread": true, 
       "image_ref": [ 
         "52", 
         0 
       ], 
       "image_target": [ 
         "78", 
         0 
       ] 
     }, 
     "class_type": "ColorMatch", 
     "_meta": { 
       "title": "Color Match" 
     } 
   }, 
   "128": { 
     "inputs": { 
       "unet_name": "smoothMixWan2214BI2V_i2vLow.safetensors", 
       "weight_dtype": "default" 
     }, 
     "class_type": "UNETLoader", 
     "_meta": { 
       "title": "UNet加载器" 
     } 
   }, 
   "131": { 
     "inputs": { 
       "unet_name": "smoothMixWan2214BI2V_i2vHigh.safetensors", 
       "weight_dtype": "default" 
     }, 
     "class_type": "UNETLoader", 
     "_meta": { 
       "title": "UNet加载器" 
     } 
   } 
};

export const WAN22_WORKFLOW = { 
  "84": { 
    "inputs": { 
      "clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors", 
      "type": "wan", 
      "device": "default" 
    }, 
    "class_type": "CLIPLoader", 
    "_meta": { 
      "title": "加载CLIP" 
    } 
  }, 
  "85": { 
    "inputs": { 
      "add_noise": "disable", 
      "noise_seed": 0, 
      "steps": 4, 
      "cfg": 1, 
      "sampler_name": "euler", 
      "scheduler": "simple", 
      "start_at_step": 2, 
      "end_at_step": 4, 
      "return_with_leftover_noise": "disable", 
      "model": [ 
        "103", 
        0 
      ], 
      "positive": [ 
        "98", 
        0 
      ], 
      "negative": [ 
        "98", 
        1 
      ], 
      "latent_image": [ 
        "86", 
        0 
      ] 
    }, 
    "class_type": "KSamplerAdvanced", 
    "_meta": { 
      "title": "K采样器（高级）" 
    } 
  }, 
  "86": { 
    "inputs": { 
      "add_noise": "enable", 
      "noise_seed": 1087771616731883, 
      "steps": 4, 
      "cfg": 1, 
      "sampler_name": "euler", 
      "scheduler": "simple", 
      "start_at_step": 0, 
      "end_at_step": 2, 
      "return_with_leftover_noise": "enable", 
      "model": [ 
        "104", 
        0 
      ], 
      "positive": [ 
        "98", 
        0 
      ], 
      "negative": [ 
        "98", 
        1 
      ], 
      "latent_image": [ 
        "98", 
        2 
      ] 
    }, 
    "class_type": "KSamplerAdvanced", 
    "_meta": { 
      "title": "K采样器（高级）" 
    } 
  }, 
  "87": { 
    "inputs": { 
      "samples": [ 
        "85", 
        0 
      ], 
      "vae": [ 
        "90", 
        0 
      ] 
    }, 
    "class_type": "VAEDecode", 
    "_meta": { 
      "title": "VAE解码" 
    } 
  }, 
  "89": { 
    "inputs": { 
      "text": "色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，三条腿，背景人很多，倒着走", 
      "clip": [ 
        "84", 
        0 
      ] 
    }, 
    "class_type": "CLIPTextEncode", 
    "_meta": { 
      "title": "CLIP Text Encode (Negative Prompt)" 
    } 
  }, 
  "90": { 
    "inputs": { 
      "vae_name": "wan_2.1_vae.safetensors" 
    }, 
    "class_type": "VAELoader", 
    "_meta": { 
      "title": "加载VAE" 
    } 
  }, 
  "93": { 
    "inputs": { 
      "text": "Slow camera zoom in, the woman lies still, snow falling gently, mist swirling, dreamlike atmosphere, high quality, steadycam.", 
      "clip": [ 
        "84", 
        0 
      ] 
    }, 
    "class_type": "CLIPTextEncode", 
    "_meta": { 
      "title": "CLIP Text Encode (Positive Prompt)" 
    } 
  }, 
  "94": { 
    "inputs": { 
      "fps": 16, 
      "images": [ 
        "87", 
        0 
      ] 
    }, 
    "class_type": "CreateVideo", 
    "_meta": { 
      "title": "创建视频" 
    } 
  }, 
  "95": { 
    "inputs": { 
      "unet_name": "wan2.2_i2v_high_noise_14B_fp8_scaled.safetensors", 
      "weight_dtype": "default" 
    }, 
    "class_type": "UNETLoader", 
    "_meta": { 
      "title": "UNet加载器" 
    } 
  }, 
  "96": { 
    "inputs": { 
      "unet_name": "wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors", 
      "weight_dtype": "default" 
    }, 
    "class_type": "UNETLoader", 
    "_meta": { 
      "title": "UNet加载器" 
    } 
  }, 
  "97": { 
    "inputs": { 
      "image": "IMG.png" 
    }, 
    "class_type": "LoadImage", 
    "_meta": { 
      "title": "加载图像" 
    } 
  }, 
  "98": { 
    "inputs": { 
      "width": 960, 
      "height": 512, 
      "length": 81, 
      "batch_size": 1, 
      "positive": [ 
        "93", 
        0 
      ], 
      "negative": [ 
        "89", 
        0 
      ], 
      "vae": [ 
        "90", 
        0 
      ], 
      "start_image": [ 
        "97", 
        0 
      ] 
    }, 
    "class_type": "WanImageToVideo", 
    "_meta": { 
      "title": "图像到视频（Wan）" 
     } 
   }, 
   "101": { 
     "inputs": { 
       "lora_name": "lightx2v_I2V_14B_480p_cfg_step_distill_rank128_bf16.safetensors", 
       "strength_model": 3, 
       "model": [ 
         "95", 
         0 
       ] 
     }, 
     "class_type": "LoraLoaderModelOnly", 
     "_meta": { 
       "title": "LoRA加载器（仅模型）" 
     } 
   }, 
   "102": { 
     "inputs": { 
       "lora_name": "lightx2v_I2V_14B_480p_cfg_step_distill_rank128_bf16.safetensors", 
       "strength_model": 1.5, 
       "model": [ 
         "96", 
         0 
       ] 
     }, 
     "class_type": "LoraLoaderModelOnly", 
     "_meta": { 
       "title": "LoRA加载器（仅模型）" 
     } 
   }, 
   "103": { 
     "inputs": { 
       "shift": 5.000000000000001, 
       "model": [ 
         "102", 
         0 
       ] 
     }, 
     "class_type": "ModelSamplingSD3", 
     "_meta": { 
       "title": "采样算法（SD3）" 
     } 
   }, 
   "104": { 
     "inputs": { 
       "shift": 5.000000000000001, 
       "model": [ 
         "101", 
         0 
       ] 
     }, 
     "class_type": "ModelSamplingSD3", 
     "_meta": { 
       "title": "采样算法（SD3）" 
     } 
   }, 
   "108": { 
     "inputs": { 
       "filename_prefix": "Video/mv-maker-comfyui/000033",
       "format": "auto", 
       "codec": "auto", 
       "video-preview": "", 
       "video": [ 
         "94", 
         0 
       ] 
     }, 
     "class_type": "SaveVideo", 
     "_meta": { 
       "title": "保存视频" 
     } 
   }, 
   "116": { 
     "inputs": { 
       "from_direction": "end", 
       "count": 1, 
       "image": [ 
         "87", 
         0 
       ] 
     }, 
     "class_type": "Pick From Batch (mtb)", 
     "_meta": { 
       "title": "Pick From Batch (mtb)" 
     } 
   }, 
   "117": { 
     "inputs": { 
       "filename_prefix": "Video/mv-maker-comfyui/213353LASTFRAME",
       "images": [ 
         "116", 
         0 
       ] 
     }, 
     "class_type": "SaveImage", 
     "_meta": { 
       "title": "保存图像" 
     } 
   }, 
   "118": { 
     "inputs": { 
       "images": [ 
         "116", 
         0 
       ] 
     }, 
     "class_type": "PreviewImage", 
     "_meta": { 
       "title": "预览图像" 
     } 
   } 
};
export const LTX23_WORKFLOW = {
  "75": {
    "inputs": {
      "filename_prefix": "video/LTX_2.3_i2v",
      "format": "auto",
      "codec": "auto",
      "video": [
        "320:310",
        0
      ]
    },
    "class_type": "SaveVideo",
    "_meta": {
      "title": "保存视频"
    }
  },
  "269": {
    "inputs": {
      "image": "egyptian_queen.png"
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "加载图像"
    }
  },
  "320:276": {
    "inputs": {
      "noise_seed": 42
    },
    "class_type": "RandomNoise",
    "_meta": {
      "title": "随机噪波"
    }
  },
  "320:277": {
    "inputs": {
      "noise_seed": 519681071352364
    },
    "class_type": "RandomNoise",
    "_meta": {
      "title": "随机噪波"
    }
  },
  "320:278": {
    "inputs": {
      "video_latent": [
        "320:288",
        0
      ],
      "audio_latent": [
        "320:307",
        1
      ]
    },
    "class_type": "LTXVConcatAVLatent",
    "_meta": {
      "title": "LTXVConcatAVLatent"
    }
  },
  "320:279": {
    "inputs": {
      "ckpt_name": "ltx-2.3-22b-dev-fp8.safetensors"
    },
    "class_type": "LTXVAudioVAELoader",
    "_meta": {
      "title": "LTXV音频VAE加载器"
    }
  },
  "320:280": {
    "inputs": {
      "sampler_name": "euler_cfg_pp"
    },
    "class_type": "KSamplerSelect",
    "_meta": {
      "title": "K采样器选择"
    }
  },
  "320:281": {
    "inputs": {
      "sigmas": "0.85, 0.7250, 0.4219, 0.0"
    },
    "class_type": "ManualSigmas",
    "_meta": {
      "title": "自定义Sigmas"
    }
  },
  "320:282": {
    "inputs": {
      "cfg": 1,
      "model": [
        "320:285",
        0
      ],
      "positive": [
        "320:284",
        0
      ],
      "negative": [
        "320:284",
        1
      ]
    },
    "class_type": "CFGGuider",
    "_meta": {
      "title": "CFG引导器"
    }
  },
  "320:283": {
    "inputs": {
      "noise": [
        "320:277",
        0
      ],
      "guider": [
        "320:314",
        0
      ],
      "sampler": [
        "320:291",
        0
      ],
      "sigmas": [
        "320:306",
        0
      ],
      "latent_image": [
        "320:318",
        0
      ]
    },
    "class_type": "SamplerCustomAdvanced",
    "_meta": {
      "title": "自定义采样器（高级）"
    }
  },
  "320:284": {
    "inputs": {
      "positive": [
        "320:304",
        0
      ],
      "negative": [
        "320:304",
        1
      ],
      "latent": [
        "320:307",
        0
      ]
    },
    "class_type": "LTXVCropGuides",
    "_meta": {
      "title": "LTXV裁剪指导"
    }
  },
  "320:285": {
    "inputs": {
      "lora_name": "ltx-2.3-22b-distilled-lora-384.safetensors",
      "strength_model": 0.5,
      "model": [
        "320:316",
        0
      ]
    },
    "class_type": "LoraLoaderModelOnly",
    "_meta": {
      "title": "LoRA加载器（仅模型）"
    }
  },
  "320:286": {
    "inputs": {
      "longer_edge": 1536,
      "images": [
        "320:290",
        0
      ]
    },
    "class_type": "ResizeImagesByLongerEdge",
    "_meta": {
      "title": "缩放图像（长边）"
    }
  },
  "320:287": {
    "inputs": {
      "samples": [
        "320:307",
        0
      ],
      "upscale_model": [
        "320:311",
        0
      ],
      "vae": [
        "320:316",
        2
      ]
    },
    "class_type": "LTXVLatentUpsampler",
    "_meta": {
      "title": "LTXV潜空间上采样器"
    }
  },
  "320:288": {
    "inputs": {
      "strength": 1,
      "bypass": [
        "320:302",
        0
      ],
      "vae": [
        "320:316",
        2
      ],
      "image": [
        "320:289",
        0
      ],
      "latent": [
        "320:287",
        0
      ]
    },
    "class_type": "LTXVImgToVideoInplace",
    "_meta": {
      "title": "LTXV图像转视频（原地）"
    }
  },
  "320:289": {
    "inputs": {
      "img_compression": 18,
      "image": [
        "320:286",
        0
      ]
    },
    "class_type": "LTXVPreprocess",
    "_meta": {
      "title": "LTXV预处理"
    }
  },
  "320:290": {
    "inputs": {
      "resize_type": "scale dimensions",
      "resize_type.width": [
        "320:312",
        0
      ],
      "resize_type.height": [
        "320:299",
        0
      ],
      "resize_type.crop": "center",
      "scale_method": "lanczos",
      "input": [
        "269",
        0
      ]
    },
    "class_type": "ResizeImageMaskNode",
    "_meta": {
      "title": "调整图像/掩码大小"
    }
  },
  "320:291": {
    "inputs": {
      "sampler_name": "euler_ancestral_cfg_pp"
    },
    "class_type": "KSamplerSelect",
    "_meta": {
      "title": "K采样器选择"
    }
  },
  "320:292": {
    "inputs": {
      "expression": "a/2",
      "values.a": [
        "320:312",
        0
      ]
    },
    "class_type": "ComfyMathExpression",
    "_meta": {
      "title": "数学表达式"
    }
  },
  "320:294": {
    "inputs": {
      "expression": "a/2",
      "values.a": [
        "320:299",
        0
      ]
    },
    "class_type": "ComfyMathExpression",
    "_meta": {
      "title": "数学表达式"
    }
  },
  "320:295": {
    "inputs": {
      "width": [
        "320:292",
        1
      ],
      "height": [
        "320:294",
        1
      ],
      "length": [
        "320:323",
        1
      ],
      "batch_size": 1
    },
    "class_type": "EmptyLTXVLatentVideo",
    "_meta": {
      "title": "空Latent视频（LTXV）"
    }
  },
  "320:296": {
    "inputs": {
      "strength": 0.7,
      "bypass": [
        "320:302",
        0
      ],
      "vae": [
        "320:316",
        2
      ],
      "image": [
        "320:289",
        0
      ],
      "latent": [
        "320:295",
        0
      ]
    },
    "class_type": "LTXVImgToVideoInplace",
    "_meta": {
      "title": "LTXV图像转视频（原地）"
    }
  },
  "320:297": {
    "inputs": {
      "samples": [
        "320:309",
        1
      ],
      "audio_vae": [
        "320:279",
        0
      ]
    },
    "class_type": "LTXVAudioVAEDecode",
    "_meta": {
      "title": "LTXV音频VAE解码"
    }
  },
  "320:298": {
    "inputs": {
      "expression": "a",
      "values.a": [
        "320:300",
        0
      ]
    },
    "class_type": "ComfyMathExpression",
    "_meta": {
      "title": "数学表达式"
    }
  },
  "320:299": {
    "inputs": {
      "value": 720
    },
    "class_type": "PrimitiveInt",
    "_meta": {
      "title": "Height"
    }
  },
  "320:300": {
    "inputs": {
      "value": 25
    },
    "class_type": "PrimitiveInt",
    "_meta": {
      "title": "Frame Rate"
    }
  },
  "320:301": {
    "inputs": {
      "value": 10
    },
    "class_type": "PrimitiveInt",
    "_meta": {
      "title": "Duration"
    }
  },
  "320:302": {
    "inputs": {
      "value": false
    },
    "class_type": "PrimitiveBoolean",
    "_meta": {
      "title": "Switch to Text to Video?"
    }
  },
  "320:303": {
    "inputs": {
      "text": [
        "320:319",
        0
      ],
      "clip": [
        "320:317",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP文本编码"
    }
  },
  "320:304": {
    "inputs": {
      "frame_rate": [
        "320:298",
        0
      ],
      "positive": [
        "320:303",
        0
      ],
      "negative": [
        "320:313",
        0
      ]
    },
    "class_type": "LTXVConditioning",
    "_meta": {
      "title": "LTXV条件"
    }
  },
  "320:305": {
    "inputs": {
      "frames_number": [
        "320:323",
        1
      ],
      "frame_rate": [
        "320:298",
        1
      ],
      "batch_size": 1,
      "audio_vae": [
        "320:279",
        0
      ]
    },
    "class_type": "LTXVEmptyLatentAudio",
    "_meta": {
      "title": "LTXV 空音频潜空间"
    }
  },
  "320:306": {
    "inputs": {
      "sigmas": "1.0, 0.99375, 0.9875, 0.98125, 0.975, 0.909375, 0.725, 0.421875, 0.0"
    },
    "class_type": "ManualSigmas",
    "_meta": {
      "title": "自定义Sigmas"
    }
  },
  "320:307": {
    "inputs": {
      "av_latent": [
        "320:283",
        0
      ]
    },
    "class_type": "LTXVSeparateAVLatent",
    "_meta": {
      "title": "LTXV分离音视频潜空间"
    }
  },
  "320:308": {
    "inputs": {
      "noise": [
        "320:276",
        0
      ],
      "guider": [
        "320:282",
        0
      ],
      "sampler": [
        "320:280",
        0
      ],
      "sigmas": [
        "320:281",
        0
      ],
      "latent_image": [
        "320:278",
        0
      ]
    },
    "class_type": "SamplerCustomAdvanced",
    "_meta": {
      "title": "自定义采样器（高级）"
    }
  },
  "320:309": {
    "inputs": {
      "av_latent": [
        "320:308",
        0
      ]
    },
    "class_type": "LTXVSeparateAVLatent",
    "_meta": {
      "title": "LTXV分离音视频潜空间"
    }
  },
  "320:310": {
    "inputs": {
      "fps": [
        "320:298",
        0
      ],
      "images": [
        "320:315",
        0
      ],
      "audio": [
        "320:297",
        0
      ]
    },
    "class_type": "CreateVideo",
    "_meta": {
      "title": "创建视频"
    }
  },
  "320:311": {
    "inputs": {
      "model_name": "ltx-2.3-spatial-upscaler-x2-1.1.safetensors"
    },
    "class_type": "LatentUpscaleModelLoader",
    "_meta": {
      "title": "加载Latent放大模型"
    }
  },
  "320:312": {
    "inputs": {
      "value": 1280
    },
    "class_type": "PrimitiveInt",
    "_meta": {
      "title": "Width"
    }
  },
  "320:313": {
    "inputs": {
      "text": "pc game, console game, video game, cartoon, childish, ugly",
      "clip": [
        "320:317",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP文本编码"
    }
  },
  "320:314": {
    "inputs": {
      "cfg": 1,
      "model": [
        "320:285",
        0
      ],
      "positive": [
        "320:304",
        0
      ],
      "negative": [
        "320:304",
        1
      ]
    },
    "class_type": "CFGGuider",
    "_meta": {
      "title": "CFG引导器"
    }
  },
  "320:315": {
    "inputs": {
      "tile_size": 768,
      "overlap": 64,
      "temporal_size": 4096,
      "temporal_overlap": 4,
      "samples": [
        "320:309",
        0
      ],
      "vae": [
        "320:316",
        2
      ]
    },
    "class_type": "VAEDecodeTiled",
    "_meta": {
      "title": "VAE解码（分块）"
    }
  },
  "320:316": {
    "inputs": {
      "ckpt_name": "ltx-2.3-22b-dev-fp8.safetensors"
    },
    "class_type": "CheckpointLoaderSimple",
    "_meta": {
      "title": "Checkpoint加载器（简易）"
    }
  },
  "320:317": {
    "inputs": {
      "text_encoder": "gemma_3_12B_it_fp4_mixed.safetensors",
      "ckpt_name": "ltx-2.3-22b-dev-fp8.safetensors",
      "device": "default"
    },
    "class_type": "LTXAVTextEncoderLoader",
    "_meta": {
      "title": "LTXV音频文本编码器加载器"
    }
  },
  "320:318": {
    "inputs": {
      "video_latent": [
        "320:296",
        0
      ],
      "audio_latent": [
        "320:305",
        0
      ]
    },
    "class_type": "LTXVConcatAVLatent",
    "_meta": {
      "title": "LTXVConcatAVLatent"
    }
  },
  "320:319": {
    "inputs": {
      "value": "Egyptian royal in blue-and-gold headdress and high collar, white dress with golden embroidery and armbands, desert, robot soldiers in formation left and right. She walks steadily forward, head held level and gaze fixed ahead—no dipping or lowering of the head. The camera performs a single, smooth push-in only: starting in a wider shot of her, the robots, and the desert, it moves steadily forward until she is in a medium or medium-close frame, then holds. She stops, posture and head still upright, and says: “The old gods are silent. I am not.” Robot soldiers shift or march in place; sand and fabric move with the wind. No pull-back; the only camera move is the continuous push-in."
    },
    "class_type": "PrimitiveStringMultiline",
    "_meta": {
      "title": "Prompt"
    }
  },
  "320:323": {
    "inputs": {
      "expression": "a * b + 1",
      "values.a": [
        "320:301",
        0
      ],
      "values.b": [
        "320:300",
        0
      ]
    },
    "class_type": "ComfyMathExpression",
    "_meta": {
      "title": "Math Expression (length)"
    }
  },
  "320:324": {
    "inputs": {
      "from_direction": "end",
      "count": 1,
      "image": [
        "320:315",
        0
      ]
    },
    "class_type": "Pick From Batch (mtb)",
    "_meta": {
      "title": "Pick From Batch (mtb)"
    }
  },
  "320:325": {
    "inputs": {
      "filename_prefix": "video/LTX_2.3_LASTFRAME",
      "images": [
        "320:324",
        0
      ]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "保存图像"
    }
  }
};

/**
 * H3 Turbo Stable 4V4A API workflow.
 * Optional media inputs are attached at request time in MVInfoCard.
 */
export const H3_TURBO_STABLE_4V4A_WORKFLOW = {
  "1": {
    "inputs": { "unet_name": "minimax_h3_fl2va_int8_convrot.safetensors", "weight_dtype": "default" },
    "class_type": "UNETLoader",
    "_meta": { "title": "UNet加载器" }
  },
  "2": {
    "inputs": {
      "lora_name": "minimax_h3_turbo_4_E6_AD_A5_E5_8A_A0_E9_80_9Fema_comfyui.safetensors",
      "strength_model": 1,
      "model": ["1", 0]
    },
    "class_type": "LoraLoaderBypassModelOnly",
    "_meta": { "title": "加载 H3 Turbo LoRA" }
  },
  "3": {
    "inputs": { "clip_name": "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors", "type": "minimax", "device": "default" },
    "class_type": "CLIPLoader",
    "_meta": { "title": "加载 CLIP" }
  },
  "4": {
    "inputs": { "vae_name": "minimax_h3_video_vae_fp16.safetensors" },
    "class_type": "VAELoader",
    "_meta": { "title": "加载视频 VAE" }
  },
  "5": {
    "inputs": { "vae_name": "minimax_h3_audio_vae_fp32.safetensors" },
    "class_type": "VAELoader",
    "_meta": { "title": "加载音频 VAE" }
  },
  "6": {
    "inputs": {
      "prompt": "",
      "width": 736,
      "height": 416,
      "length": 141,
      "task_type": "I2VA",
      "audio_mode": "lock_source",
      "audio_denoise_strength": 1,
      "add_source_as_reference": false,
      "prompt_primary_audio_ordinal": 0,
      "strict_prompt_tags": true,
      "ref_image_size": "match",
      "reference_video_policy": "official_2_to_15s",
      "clip": ["3", 0],
      "video_vae": ["4", 0],
      "audio_vae": ["5", 0]
    },
    "class_type": "MiniMaxH3AudioConditioningT8",
    "_meta": { "title": "MiniMax H3 Audio Conditioning (T8)" }
  },
  "7": {
    "inputs": {
      "steps": 4,
      "shift_video": 12,
      "shift_audio": 3,
      "sampler_name": "dual_clock_euler",
      "scheduler": "native_flow",
      "model": ["2", 0],
      "av_latent": ["6", 1]
    },
    "class_type": "MiniMaxH3DualClockSamplerT8",
    "_meta": { "title": "STABLE 4 video / 4 audio" }
  },
  "8": {
    "inputs": { "model": ["7", 0], "conditioning": ["6", 0] },
    "class_type": "BasicGuider",
    "_meta": { "title": "基本引导器" }
  },
  "9": {
    "inputs": { "noise_seed": 123456789 },
    "class_type": "RandomNoise",
    "_meta": { "title": "随机噪波" }
  },
  "10": {
    "inputs": { "noise": ["9", 0], "guider": ["8", 0], "sampler": ["7", 1], "sigmas": ["7", 2], "latent_image": ["6", 1] },
    "class_type": "SamplerCustomAdvanced",
    "_meta": { "title": "自定义采样器（高级）" }
  },
  "11": {
    "inputs": { "av_latent": ["10", 0], "video_vae": ["4", 0], "audio_vae": ["5", 0] },
    "class_type": "MiniMaxH3AVDecodeT8",
    "_meta": { "title": "MiniMax H3 AV Decode (T8)" }
  },
  "12": {
    "inputs": {
      "frame_rate": 24,
      "loop_count": 0,
      "filename_prefix": "MiniMaxH3/stable_4v4a",
      "format": "video/h264-mp4",
      "pix_fmt": "yuv420p",
      "crf": 19,
      "save_metadata": true,
      "trim_to_audio": false,
      "pingpong": false,
      "save_output": true,
      "images": ["11", 0],
      "audio": ["11", 1]
    },
    "class_type": "VHS_VideoCombine",
    "_meta": { "title": "Video Combine" }
  },
  "14": {
    "inputs": { "from_direction": "end", "count": 1, "image": ["11", 0] },
    "class_type": "Pick From Batch (mtb)",
    "_meta": { "title": "Pick Last Frame" }
  },
  "15": {
    "inputs": { "filename_prefix": "MiniMaxH3/stable_4v4a_LASTFRAME", "images": ["14", 0] },
    "class_type": "SaveImage",
    "_meta": { "title": "保存最后一帧" }
  }
};

export const VIDEO_WORKFLOWS = {
  'SmoothV2': SMOOTH_V2_WORKFLOW,
  'SmoothV1': SMOOTH_V1_WORKFLOW,
  'Wan22': WAN22_WORKFLOW,
  'LTX2.3': LTX23_WORKFLOW,
  'LTX2.3 V2I': LTX23_V2I_WORKFLOW_JSON,
  'H3 Turbo Stable 4V4A': H3_TURBO_STABLE_4V4A_WORKFLOW,
};

// Backwards compatibility or default export if needed, but we should switch to using VIDEO_WORKFLOWS
export const VIDEO_GENERATION_WORKFLOW = SMOOTH_V2_WORKFLOW;
