# Model Aliases

`Mai Desktop Companion app` shows friendly `Mai` aliases in the UI while still sending the real model IDs to the API in the background.

## Mai Studio Node

- Preferred node: `http://100.122.177.97:1234/v1`
- Local fallback: `http://127.0.0.1:1234/v1`

## Alias Catalog

### Chat / Core

| Alias | Use case |
| --- | --- |
| `Mai Core-7B v1.0` | The entry-level workhorse. Great for chatbots, summarization, and local deployment. |
| `Mai Core-14B v1.5` | The sweet spot model. Highly capable in reasoning and nuanced writing without needing massive hardware. |
| `Mai Logic-32B v2.0` | Heavy reasoning, complex coding tasks, and multi-step agentic workflows. |

### Vision

| Alias | Use case |
| --- | --- |
| `Mai Vision-8B v1.2` | Standard image-to-text generation, basic chart reading, and visual QA. |
| `Mai Iris-11B v1.0` | Specialized high-resolution vision model tuned for dense OCR and document parsing. |
| `Mai Vision-34B v2.1` | Advanced multimodal reasoning for complex diagrams, video frames, and dense visual analysis. |

### Fast

| Alias | Use case |
| --- | --- |
| `Mai Nano-0.5B v1.0` | On-device processing, basic autocorrect, and simple keyword extraction. |
| `Mai Spark-1.5B v2.2` | Real-time voice assistants and rapid text classification where sub-second latency matters. |
| `Mai Flash-3B v3.0` | The speed-to-performance ratio model for fast conversational AI. |

### Big

| Alias | Use case |
| --- | --- |
| `Mai Titan-72B v1.0` | Enterprise-level data analysis, advanced mathematics, and highly accurate creative writing. |
| `Mai Apex-120B v2.0` | Near-human zero-shot reasoning for legal analysis, deep scientific research, and complex system architecture. |
| `Mai Omni-400B-MoE v1.5` | The flagship Mixture-of-Experts lane for all-in-one high-end intelligence. |

## Current Preferred Mapping

- `lmstudio-community/gemma-4-31B-it-GGUF`
  - Chat alias: `Mai Logic-32B v2.0`
  - Vision alias: `Mai Vision-34B v2.1`
  - Why: this client has RTX 5090-class hardware and wants stronger personality, screen reasoning, and practical assistant behavior.

- `lmstudio-community/Qwen3-Coder-30B-A3B-Instruct-GGUF`
  - Specialist alias: `Mai Logic-32B v2.0`
  - Why: strong coding, macro, automation, and local workflow assistance lane.

- `lmstudio-community/Ministral-3-3B-Instruct-2512-GGUF`
  - Fallback alias: `Mai Flash-3B v3.0`
  - Why: fast low-latency fallback when responsiveness matters more than depth.

## Example Heuristic Mappings

These are capability-first aliases, not literal parameter claims.

| Real model ID | UI alias |
| --- | --- |
| `qwen/qwen3.5-9b` | `Mai Core-14B v1.5` for chat, `Mai Vision-8B v1.2` for vision |
| `zai-org/glm-4.7-flash` | `Mai Flash-3B v3.0` |
| `ibm/granite-4-h-tiny` | `Mai Spark-1.5B v2.2` |
| `allenai/olmocr-2-7b` | `Mai Iris-11B v1.0` |
| `allenai/olmo-3-32b-think` | `Mai Logic-32B v2.0` |
| `openai/gpt-oss-20b` | `Mai Logic-32B v2.0` |
| `qwen/qwen3-coder-30b` | `Mai Logic-32B v2.0` |
| `harbinger-24b` | `Mai Logic-32B v2.0` |

## Notes

- The dropdowns and summaries show aliases only.
- The stored selection values remain the real model IDs so requests keep working.
- Multiple real models can share one alias family if they fit the same capability lane.
