# Google / Vertex Audit

Date: 2026-05-01

## Policy

- Primary runtime: `Google Cloud / Vertex`
- Direct Gemini fallback: `blocked` by default via `ALLOW_DIRECT_GEMINI=false`
- Legacy Studio fallbacks: `blocked` by default via `STUDIO_ALLOW_LEGACY_FALLBACKS=false`
- Goal of this phase: every public Studio card must either:
  - run on a Google billing path, or
  - fail explicitly with a traceable migration/parity code

## Registry summary

| Card | Current Google-first runtime | Billing route | Status | Legacy fallback |
| --- | --- | --- | --- | --- |
| `chat` | Vertex Gemini `gemini-2.5-flash` streaming | `vertex_stream_generate_content` | ready | blocked |
| `script` | Vertex Gemini `gemini-2.5-flash` | `vertex_generate_content` | ready | blocked |
| `voice` | Google Cloud Text-to-Speech | `google_cloud_tts` | ready | blocked |
| `caption` | Google Cloud Speech-to-Text | `google_cloud_speech_to_text` | ready | blocked |
| `image` | Vertex Imagen `imagen-3.0-generate-001` | `vertex_imagen_generate` | ready for plain generation / gap for face clone | blocked |
| `model` | Vertex Gemini + Vertex Imagen | `vertex_generate_content_plus_imagen_predict` | ready | blocked |
| `video` | Vertex Veo publisher model | `vertex_veo_predict_long_running` | ready | blocked |
| `talking_video` | Vertex Veo only in `veo_natural` mode | `vertex_veo_predict_long_running` | ready in natural mode / gap in exact speech | blocked |
| `music` | Vertex Lyria `lyria-002` | `vertex_lyria_predict` | ready | blocked |
| `ugc_bundle` | Vertex Imagen capability | `vertex_imagen_capability_predict` | ready | blocked |
| `look_split` | Vertex Gemini analysis + local segmentation | `vertex_generate_content_plus_local_segmentation` | partial | blocked |
| `render` | local ffmpeg | `local_ffmpeg_merge` | ready | n/a |
| `join` | local ffmpeg | `local_ffmpeg_concat` | ready | n/a |
| `face` | passthrough | `direct_input` | ready | n/a |
| `upscale` | pending Google mapping | `vertex_imagen_upscale_pending` | gap | blocked |
| `scene` | pending Google mapping | `vertex_imagen_scene_pending` | gap | blocked |
| `angles` | pending Google mapping | `vertex_imagen_edit_pending` | gap | blocked |
| `compose` product | pending cleanup to Imagen composition | `vertex_imagen_compose_pending` | gap | blocked |
| `compose` fitting / provador | pending VTO + Imagen orchestration | `vertex_vto_plus_imagen_pending` | gap | blocked |
| `animate` | Vertex Veo guided motion with reference video | `vertex_veo_predict_long_running` | ready | blocked |
| `lipsync` | pending Google-native replacement | `google_talking_video_pending` | gap | blocked |

## Billing intent by feature

| Feature | Expected route |
| --- | --- |
| Studio chat | Vertex Gemini streaming |
| Script generation | Vertex Gemini generateContent |
| Voice generation | Cloud Text-to-Speech |
| Caption generation | Cloud Speech-to-Text |
| Model card | Vertex Gemini prompt brief + Vertex Imagen |
| Video card | Vertex Veo `predictLongRunning` |
| Talking video natural | Vertex Veo |
| Music | Vertex Lyria |
| UGC bundle | Vertex Imagen capability |
| QC / composition analysis | Vertex Gemini generateContent |

## Explicitly blocked in this validation phase

- Direct Gemini image-preview chains
- OpenAI text/image/audio routes as automatic public runtime
- ElevenLabs as automatic voice runtime
- Fal/Kling/Flux as automatic public runtime
- Exact-speech talking video while lipsync still depends on legacy stack
- Provador / Scene / Angles / Upscale until their Google-native routes are completed

## Reason codes in use

- `google_engine_unavailable`
- `google_model_not_mapped`
- `legacy_fallback_disabled`
- `parity_gap_requires_migration`
