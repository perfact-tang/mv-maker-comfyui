
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
       "filename_prefix": "2026-02-09/wan22_", 
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
       "filename_prefix": "Video/2026-02-09/231104", 
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
       "filename_prefix": "Video/2026-02-09/231104LASTFRAME", 
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

export const VIDEO_WORKFLOWS = {
  'SmoothV2': SMOOTH_V2_WORKFLOW,
  'SmoothV1': SMOOTH_V1_WORKFLOW,
};

// Backwards compatibility or default export if needed, but we should switch to using VIDEO_WORKFLOWS
export const VIDEO_GENERATION_WORKFLOW = SMOOTH_V2_WORKFLOW;
