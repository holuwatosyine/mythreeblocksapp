// GENERATED FILE — do not edit by hand.
// Produced by @three-blocks/devtools.
import type { PrecompiledManifest } from 'three-blocks/shaders';

export default {
	"attributePlans": [
		[
			{
				"name": "uv",
				"node": null,
				"type": "vec2"
			},
			{
				"name": "faceIndex",
				"node": null,
				"type": "float"
			},
			{
				"name": "position",
				"node": null,
				"type": "vec3"
			}
		],
		[
			{
				"name": "position",
				"node": null,
				"type": "vec3"
			}
		],
		[
			{
				"name": "uv",
				"node": null,
				"type": "vec2"
			},
			{
				"name": "position",
				"node": null,
				"type": "vec3"
			}
		],
		[
			{
				"name": "normal",
				"node": null,
				"type": "vec3"
			},
			{
				"name": "position",
				"node": null,
				"type": "vec3"
			}
		]
	],
	"automatic": {
		"prefix": "auto"
	},
	"entries": {
		"auto/render-0000-pmrem_equirect": 0,
		"auto/render-0000-pmrem_ggx": 1,
		"auto/render-0000-shadowmaterial": 2,
		"auto/render-0001-pmrem_ggx": 1,
		"auto/render-h141pwxl-smokenodertt.clear-pressure": 3,
		"auto/render-h1r514kf-smokenodertt.divergence": 4,
		"auto/render-h1vaj7ld-smokenodertt.pressure": 5,
		"auto/render-h37v1kv-smokenodertt.vorticity": 6,
		"auto/render-hckh8oi-smokenodertt.advect-density": 7,
		"auto/render-hksdtoy-smokenodertt.curl": 8,
		"auto/render-hs5lzlt-smokenodertt.advect-velocity": 9,
		"auto/render-hzp0fdw-smokenodertt.gradient": 10,
		"text/accent": 11,
		"text/fluid-output": 12,
		"text/ground": 13
	},
	"fallbacks": {
		"text/dom-geist|z:0|w:400": "WebGL shader precompilation does not support PBO-backed storage reads.",
		"text/dom-geist|z:0|w:700": "WebGL shader precompilation does not support PBO-backed storage reads.",
		"text/dom-noto|z:0|w:400": "WebGL shader precompilation does not support PBO-backed storage reads.",
		"text/dom-noto|z:0|w:700": "WebGL shader precompilation does not support PBO-backed storage reads."
	},
	"layouts": [
		[
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "render",
						"uniforms": [
							{
								"name": "cameraProjectionMatrix",
								"type": "mat4"
							},
							{
								"name": "cameraViewMatrix",
								"type": "mat4"
							}
						]
					}
				],
				"name": "render"
			},
			{
				"bindings": [
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform0",
						"store": false
					},
					{
						"kind": "NodeUniformsGroup",
						"name": "object",
						"uniforms": [
							{
								"name": "nodeUniform1",
								"type": "uint"
							},
							{
								"name": "nodeUniform4",
								"type": "mat4"
							}
						]
					}
				],
				"name": "object"
			}
		],
		[
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "render",
						"uniforms": [
							{
								"name": "cameraProjectionMatrix",
								"type": "mat4"
							},
							{
								"name": "cameraViewMatrix",
								"type": "mat4"
							}
						]
					}
				],
				"name": "render"
			},
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "object",
						"uniforms": [
							{
								"name": "nodeUniform0",
								"type": "float"
							},
							{
								"name": "nodeUniform1",
								"type": "float"
							},
							{
								"name": "nodeUniform3",
								"type": "uint"
							},
							{
								"name": "nodeUniform4",
								"type": "uint"
							},
							{
								"name": "nodeUniform7",
								"type": "mat4"
							}
						]
					},
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform2",
						"store": false
					}
				],
				"name": "object"
			}
		],
		[
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "render",
						"uniforms": [
							{
								"name": "cameraProjectionMatrix",
								"type": "mat4"
							},
							{
								"name": "cameraViewMatrix",
								"type": "mat4"
							}
						]
					}
				],
				"name": "render"
			},
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "object",
						"uniforms": [
							{
								"name": "nodeUniform0",
								"type": "float"
							},
							{
								"name": "nodeUniform3",
								"type": "mat4"
							}
						]
					}
				],
				"name": "object"
			}
		],
		[
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "render",
						"uniforms": [
							{
								"name": "cameraProjectionMatrix",
								"type": "mat4"
							},
							{
								"name": "cameraViewMatrix",
								"type": "mat4"
							}
						]
					}
				],
				"name": "render"
			},
			{
				"bindings": [
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform0",
						"store": false
					},
					{
						"kind": "NodeUniformsGroup",
						"name": "object",
						"uniforms": [
							{
								"name": "nodeUniform1",
								"type": "mat3"
							},
							{
								"name": "nodeUniform2",
								"type": "uint"
							},
							{
								"name": "nodeUniform3",
								"type": "float"
							},
							{
								"name": "nodeUniform6",
								"type": "mat4"
							}
						]
					}
				],
				"name": "object"
			}
		],
		[
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "render",
						"uniforms": [
							{
								"name": "cameraProjectionMatrix",
								"type": "mat4"
							},
							{
								"name": "cameraViewMatrix",
								"type": "mat4"
							}
						]
					}
				],
				"name": "render"
			},
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "object",
						"uniforms": [
							{
								"name": "nodeUniform0",
								"type": "vec2"
							},
							{
								"name": "nodeUniform1",
								"type": "float"
							},
							{
								"name": "nodeUniform3",
								"type": "mat3"
							},
							{
								"name": "nodeUniform4",
								"type": "uint"
							},
							{
								"name": "nodeUniform5",
								"type": "mat3"
							},
							{
								"name": "nodeUniform6",
								"type": "uint"
							},
							{
								"name": "nodeUniform7",
								"type": "mat3"
							},
							{
								"name": "nodeUniform8",
								"type": "uint"
							},
							{
								"name": "nodeUniform9",
								"type": "mat3"
							},
							{
								"name": "nodeUniform10",
								"type": "uint"
							},
							{
								"name": "nodeUniform13",
								"type": "mat4"
							}
						]
					},
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform2",
						"store": false
					}
				],
				"name": "object"
			}
		],
		[
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "render",
						"uniforms": [
							{
								"name": "cameraProjectionMatrix",
								"type": "mat4"
							},
							{
								"name": "cameraViewMatrix",
								"type": "mat4"
							}
						]
					}
				],
				"name": "render"
			},
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "object",
						"uniforms": [
							{
								"name": "nodeUniform0",
								"type": "float"
							},
							{
								"name": "nodeUniform2",
								"type": "mat3"
							},
							{
								"name": "nodeUniform3",
								"type": "vec2"
							},
							{
								"name": "nodeUniform4",
								"type": "float"
							},
							{
								"name": "nodeUniform5",
								"type": "uint"
							},
							{
								"name": "nodeUniform6",
								"type": "mat3"
							},
							{
								"name": "nodeUniform7",
								"type": "uint"
							},
							{
								"name": "nodeUniform8",
								"type": "mat3"
							},
							{
								"name": "nodeUniform9",
								"type": "uint"
							},
							{
								"name": "nodeUniform10",
								"type": "mat3"
							},
							{
								"name": "nodeUniform11",
								"type": "uint"
							},
							{
								"name": "nodeUniform13",
								"type": "mat3"
							},
							{
								"name": "nodeUniform14",
								"type": "uint"
							},
							{
								"name": "nodeUniform17",
								"type": "mat4"
							}
						]
					},
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform1",
						"store": false
					},
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform12",
						"store": false
					}
				],
				"name": "object"
			}
		],
		[
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "render",
						"uniforms": [
							{
								"name": "cameraProjectionMatrix",
								"type": "mat4"
							},
							{
								"name": "cameraViewMatrix",
								"type": "mat4"
							}
						]
					}
				],
				"name": "render"
			},
			{
				"bindings": [
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform0",
						"store": false
					},
					{
						"kind": "NodeUniformsGroup",
						"name": "object",
						"uniforms": [
							{
								"name": "nodeUniform1",
								"type": "mat3"
							},
							{
								"name": "nodeUniform2",
								"type": "vec2"
							},
							{
								"name": "nodeUniform3",
								"type": "float"
							},
							{
								"name": "nodeUniform4",
								"type": "uint"
							},
							{
								"name": "nodeUniform5",
								"type": "mat3"
							},
							{
								"name": "nodeUniform6",
								"type": "uint"
							},
							{
								"name": "nodeUniform7",
								"type": "mat3"
							},
							{
								"name": "nodeUniform8",
								"type": "uint"
							},
							{
								"name": "nodeUniform9",
								"type": "mat3"
							},
							{
								"name": "nodeUniform10",
								"type": "uint"
							},
							{
								"name": "nodeUniform11",
								"type": "float"
							},
							{
								"name": "nodeUniform12",
								"type": "mat3"
							},
							{
								"name": "nodeUniform13",
								"type": "uint"
							},
							{
								"name": "nodeUniform15",
								"type": "mat3"
							},
							{
								"name": "nodeUniform16",
								"type": "uint"
							},
							{
								"name": "nodeUniform17",
								"type": "float"
							},
							{
								"name": "nodeUniform20",
								"type": "mat4"
							}
						]
					},
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform14",
						"store": false
					}
				],
				"name": "object"
			}
		],
		[
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "render",
						"uniforms": [
							{
								"name": "cameraProjectionMatrix",
								"type": "mat4"
							},
							{
								"name": "cameraViewMatrix",
								"type": "mat4"
							}
						]
					}
				],
				"name": "render"
			},
			{
				"bindings": [
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform0",
						"store": false
					},
					{
						"kind": "NodeUniformsGroup",
						"name": "object",
						"uniforms": [
							{
								"name": "nodeUniform1",
								"type": "mat3"
							},
							{
								"name": "nodeUniform2",
								"type": "float"
							},
							{
								"name": "nodeUniform4",
								"type": "mat3"
							},
							{
								"name": "nodeUniform5",
								"type": "uint"
							},
							{
								"name": "nodeUniform6",
								"type": "vec2"
							},
							{
								"name": "nodeUniform7",
								"type": "uint"
							},
							{
								"name": "nodeUniform8",
								"type": "float"
							},
							{
								"name": "nodeUniform11",
								"type": "mat4"
							}
						]
					},
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform3",
						"store": false
					}
				],
				"name": "object"
			}
		],
		[
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "render",
						"uniforms": [
							{
								"name": "cameraProjectionMatrix",
								"type": "mat4"
							},
							{
								"name": "cameraViewMatrix",
								"type": "mat4"
							}
						]
					}
				],
				"name": "render"
			},
			{
				"bindings": [
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform0",
						"store": false
					},
					{
						"kind": "NodeUniformsGroup",
						"name": "object",
						"uniforms": [
							{
								"name": "nodeUniform1",
								"type": "mat3"
							},
							{
								"name": "nodeUniform2",
								"type": "vec2"
							},
							{
								"name": "nodeUniform3",
								"type": "float"
							},
							{
								"name": "nodeUniform4",
								"type": "uint"
							},
							{
								"name": "nodeUniform5",
								"type": "mat3"
							},
							{
								"name": "nodeUniform6",
								"type": "uint"
							},
							{
								"name": "nodeUniform7",
								"type": "mat3"
							},
							{
								"name": "nodeUniform8",
								"type": "uint"
							},
							{
								"name": "nodeUniform9",
								"type": "mat3"
							},
							{
								"name": "nodeUniform10",
								"type": "uint"
							},
							{
								"name": "nodeUniform13",
								"type": "mat4"
							}
						]
					}
				],
				"name": "object"
			}
		],
		[
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "render",
						"uniforms": [
							{
								"name": "cameraProjectionMatrix",
								"type": "mat4"
							},
							{
								"name": "cameraViewMatrix",
								"type": "mat4"
							}
						]
					}
				],
				"name": "render"
			},
			{
				"bindings": [
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform0",
						"store": false
					},
					{
						"kind": "NodeUniformsGroup",
						"name": "object",
						"uniforms": [
							{
								"name": "nodeUniform1",
								"type": "mat3"
							},
							{
								"name": "nodeUniform2",
								"type": "float"
							},
							{
								"name": "nodeUniform3",
								"type": "mat3"
							},
							{
								"name": "nodeUniform4",
								"type": "uint"
							},
							{
								"name": "nodeUniform5",
								"type": "vec2"
							},
							{
								"name": "nodeUniform6",
								"type": "uint"
							},
							{
								"name": "nodeUniform7",
								"type": "float"
							},
							{
								"name": "nodeUniform10",
								"type": "mat4"
							}
						]
					}
				],
				"name": "object"
			}
		],
		[
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "render",
						"uniforms": [
							{
								"name": "cameraProjectionMatrix",
								"type": "mat4"
							},
							{
								"name": "cameraViewMatrix",
								"type": "mat4"
							}
						]
					}
				],
				"name": "render"
			},
			{
				"bindings": [
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform0",
						"store": false
					},
					{
						"kind": "NodeUniformsGroup",
						"name": "object",
						"uniforms": [
							{
								"name": "nodeUniform1",
								"type": "mat3"
							},
							{
								"name": "nodeUniform2",
								"type": "uint"
							},
							{
								"name": "nodeUniform4",
								"type": "mat3"
							},
							{
								"name": "nodeUniform5",
								"type": "vec2"
							},
							{
								"name": "nodeUniform6",
								"type": "float"
							},
							{
								"name": "nodeUniform7",
								"type": "uint"
							},
							{
								"name": "nodeUniform8",
								"type": "mat3"
							},
							{
								"name": "nodeUniform9",
								"type": "uint"
							},
							{
								"name": "nodeUniform10",
								"type": "mat3"
							},
							{
								"name": "nodeUniform11",
								"type": "uint"
							},
							{
								"name": "nodeUniform12",
								"type": "mat3"
							},
							{
								"name": "nodeUniform13",
								"type": "uint"
							},
							{
								"name": "nodeUniform16",
								"type": "mat4"
							}
						]
					},
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform3",
						"store": false
					}
				],
				"name": "object"
			}
		],
		[
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "render",
						"uniforms": [
							{
								"name": "cameraProjectionMatrix",
								"type": "mat4"
							},
							{
								"name": "cameraViewMatrix",
								"type": "mat4"
							},
							{
								"name": "nodeUniform11",
								"type": "color"
							},
							{
								"name": "nodeUniform18",
								"type": "color"
							},
							{
								"name": "nodeUniform23",
								"type": "color"
							},
							{
								"name": "nodeUniform26",
								"type": "color"
							},
							{
								"name": "nodeUniform9",
								"type": "vec3"
							},
							{
								"name": "nodeUniform10",
								"type": "vec3"
							},
							{
								"name": "nodeUniform16",
								"type": "vec3"
							},
							{
								"name": "nodeUniform17",
								"type": "vec3"
							},
							{
								"name": "nodeUniform21",
								"type": "vec3"
							},
							{
								"name": "nodeUniform22",
								"type": "vec3"
							},
							{
								"name": "cameraWorldMatrix",
								"type": "mat4"
							}
						]
					}
				],
				"name": "render"
			},
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "object",
						"uniforms": [
							{
								"name": "nodeUniform0",
								"type": "color"
							},
							{
								"name": "nodeUniform1",
								"type": "float"
							},
							{
								"name": "nodeUniform2",
								"type": "float"
							},
							{
								"name": "nodeUniform3",
								"type": "float"
							},
							{
								"name": "nodeUniform5",
								"type": "mat3"
							},
							{
								"name": "nodeUniform6",
								"type": "color"
							},
							{
								"name": "nodeUniform7",
								"type": "float"
							},
							{
								"name": "nodeUniform12",
								"type": "mat4"
							},
							{
								"name": "nodeUniform14",
								"type": "uint"
							},
							{
								"name": "nodeUniform15",
								"type": "uint"
							},
							{
								"name": "nodeUniform19",
								"type": "uint"
							},
							{
								"name": "nodeUniform20",
								"type": "uint"
							},
							{
								"name": "nodeUniform24",
								"type": "uint"
							},
							{
								"name": "nodeUniform25",
								"type": "uint"
							},
							{
								"name": "nodeUniform27",
								"type": "float"
							},
							{
								"name": "nodeUniform28",
								"type": "mat4"
							},
							{
								"name": "nodeUniform30",
								"type": "float"
							},
							{
								"name": "nodeUniform31",
								"type": "float"
							},
							{
								"name": "nodeUniform33",
								"type": "uint"
							},
							{
								"name": "nodeUniform34",
								"type": "uint"
							},
							{
								"name": "nodeUniform35",
								"type": "float"
							},
							{
								"name": "nodeUniform36",
								"type": "uint"
							},
							{
								"name": "nodeUniform37",
								"type": "uint"
							},
							{
								"name": "nodeUniform38",
								"type": "uint"
							},
							{
								"name": "nodeUniform39",
								"type": "uint"
							}
						]
					},
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform13",
						"store": false
					},
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform32",
						"store": false
					}
				],
				"name": "object"
			}
		],
		[
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "render",
						"uniforms": [
							{
								"name": "cameraProjectionMatrix",
								"type": "mat4"
							},
							{
								"name": "cameraViewMatrix",
								"type": "mat4"
							}
						]
					}
				],
				"name": "render"
			},
			{
				"bindings": [
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform0",
						"store": false
					},
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform1",
						"store": false
					},
					{
						"kind": "NodeUniformsGroup",
						"name": "object",
						"uniforms": [
							{
								"name": "nodeUniform2",
								"type": "uint"
							},
							{
								"name": "nodeUniform3",
								"type": "uint"
							},
							{
								"name": "nodeUniform6",
								"type": "mat4"
							}
						]
					}
				],
				"name": "object"
			}
		],
		[
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "render",
						"uniforms": [
							{
								"name": "cameraProjectionMatrix",
								"type": "mat4"
							},
							{
								"name": "cameraViewMatrix",
								"type": "mat4"
							},
							{
								"name": "nodeUniform11",
								"type": "color"
							},
							{
								"name": "nodeUniform28",
								"type": "color"
							},
							{
								"name": "nodeUniform33",
								"type": "color"
							},
							{
								"name": "nodeUniform36",
								"type": "color"
							},
							{
								"name": "nodeUniform9",
								"type": "vec3"
							},
							{
								"name": "nodeUniform10",
								"type": "vec3"
							},
							{
								"name": "nodeUniform26",
								"type": "vec3"
							},
							{
								"name": "nodeUniform27",
								"type": "vec3"
							},
							{
								"name": "nodeUniform31",
								"type": "vec3"
							},
							{
								"name": "nodeUniform32",
								"type": "vec3"
							},
							{
								"name": "nodeUniform13",
								"type": "mat4"
							},
							{
								"name": "nodeUniform14",
								"type": "float"
							},
							{
								"name": "nodeUniform15",
								"type": "float"
							},
							{
								"name": "nodeUniform16",
								"type": "vec2"
							},
							{
								"name": "nodeUniform22",
								"type": "float"
							},
							{
								"name": "cameraWorldMatrix",
								"type": "mat4"
							}
						]
					}
				],
				"name": "render"
			},
			{
				"bindings": [
					{
						"kind": "NodeUniformsGroup",
						"name": "object",
						"uniforms": [
							{
								"name": "nodeUniform0",
								"type": "color"
							},
							{
								"name": "nodeUniform1",
								"type": "float"
							},
							{
								"name": "nodeUniform2",
								"type": "float"
							},
							{
								"name": "nodeUniform3",
								"type": "float"
							},
							{
								"name": "nodeUniform5",
								"type": "mat3"
							},
							{
								"name": "nodeUniform6",
								"type": "color"
							},
							{
								"name": "nodeUniform7",
								"type": "float"
							},
							{
								"name": "nodeUniform12",
								"type": "mat4"
							},
							{
								"name": "nodeUniform18",
								"type": "uint"
							},
							{
								"name": "nodeUniform19",
								"type": "uint"
							},
							{
								"name": "nodeUniform20",
								"type": "uint"
							},
							{
								"name": "nodeUniform21",
								"type": "uint"
							},
							{
								"name": "nodeUniform24",
								"type": "uint"
							},
							{
								"name": "nodeUniform25",
								"type": "uint"
							},
							{
								"name": "nodeUniform29",
								"type": "uint"
							},
							{
								"name": "nodeUniform30",
								"type": "uint"
							},
							{
								"name": "nodeUniform34",
								"type": "uint"
							},
							{
								"name": "nodeUniform35",
								"type": "uint"
							},
							{
								"name": "nodeUniform37",
								"type": "float"
							},
							{
								"name": "nodeUniform38",
								"type": "mat4"
							},
							{
								"name": "nodeUniform40",
								"type": "float"
							},
							{
								"name": "nodeUniform41",
								"type": "float"
							},
							{
								"name": "nodeUniform43",
								"type": "uint"
							},
							{
								"name": "nodeUniform44",
								"type": "uint"
							},
							{
								"name": "nodeUniform45",
								"type": "float"
							},
							{
								"name": "nodeUniform46",
								"type": "uint"
							},
							{
								"name": "nodeUniform47",
								"type": "uint"
							},
							{
								"name": "nodeUniform48",
								"type": "uint"
							},
							{
								"name": "nodeUniform49",
								"type": "uint"
							}
						]
					},
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform17",
						"store": false
					},
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform23",
						"store": false
					},
					{
						"kind": "NodeSampledTexture",
						"name": "nodeUniform42",
						"store": false
					}
				],
				"name": "object"
			}
		]
	],
	"modules": ["#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\n\n\n\n\n// uniforms\n\nlayout( std140 ) uniform render {\n\tmat4 cameraProjectionMatrix;\n\tmat4 cameraViewMatrix;\n};\n\nlayout( std140 ) uniform object {\n\tuint nodeUniform1;\n\tmat4 nodeUniform4;\n};\n\n\n// varyings\nvec4 v_modelViewProjection;\nvec3 v_positionView;\nvec3 positionLocal;\nvec4 VERTEX_v_modelViewProjection;\nout vec2 nodeVarying4;\nout float nodeVarying5;\n\n\n// attributes\nlayout( location = 0 ) in vec2 uv;\nlayout( location = 1 ) in float faceIndex;\nlayout( location = 2 ) in vec3 position;\n\n\n// vars\nmat4 modelViewMatrix;\nvec4 VERTEX_nodeVar7;\n\n// codes\n\n\nvoid main() {\n\n\t// transforms\n\t\n\n\t// flow\n\t// code\n\n\tnodeVarying4 = uv;\n\tnodeVarying5 = faceIndex;\n\tmodelViewMatrix = ( cameraViewMatrix * nodeUniform4 );\n\tpositionLocal = position;\n\tv_positionView = ( modelViewMatrix * vec4( positionLocal, 1.0 ) ).xyz;\n\tVERTEX_nodeVar7 = ( cameraProjectionMatrix * vec4( v_positionView, 1.0 ) );\n\tVERTEX_v_modelViewProjection = VERTEX_nodeVar7;\n\n\t// result\n\tgl_Position = VERTEX_v_modelViewProjection;\n\n\tgl_PointSize = 1.0;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\nlayout( location = 0 ) out vec4 fragColor;\n\n\n\n// uniforms\n\nlayout( std140 ) uniform object {\n\tuint nodeUniform1;\n\tmat4 nodeUniform4;\n};\nuniform sampler2D nodeUniform0;\n\n// varyings\nin vec2 nodeVarying4;\nin float nodeVarying5;\n\n\n// vars\nvec3 nodeVar0;\nvec3 nodeVar1;\nvec2 nodeVar2;\nvec2 nodeVar3;\nbool nodeVar4;\nvec2 nodeVar5;\nvec4 nodeVar6;\n\n// codes\nvec3 getDirection ( vec2 uv, float face ) {\n\n\tvec2 nodeVar0;\n\tvec3 nodeVar1;\n\n\tnodeVar0 = uv;\n\tnodeVar0 = ( ( vec2( 2.0 ) * nodeVar0 ) - vec2( 1.0 ) );\n\tnodeVar1 = vec3( nodeVar0, 1.0 );\n\n\tif ( ( face == 0.0 ) ) {\n\n\t\tnodeVar1 = nodeVar1.zyx;\n\t\t\n\n\t} else {\n\n\n\t\tif ( ( face == 1.0 ) ) {\n\n\t\t\tnodeVar1 = nodeVar1.xzy;\n\t\t\tnodeVar1.xz = ( nodeVar1.xz * vec2( -1.0 ) );\n\t\t\t\n\n\t\t} else {\n\n\n\t\t\tif ( ( face == 2.0 ) ) {\n\n\t\t\t\tnodeVar1.x = ( nodeVar1.x * -1.0 );\n\t\t\t\t\n\n\t\t\t} else {\n\n\n\t\t\t\tif ( ( face == 3.0 ) ) {\n\n\t\t\t\t\tnodeVar1 = nodeVar1.zyx;\n\t\t\t\t\tnodeVar1.xz = ( nodeVar1.xz * vec2( -1.0 ) );\n\t\t\t\t\t\n\n\t\t\t\t} else {\n\n\n\t\t\t\t\tif ( ( face == 4.0 ) ) {\n\n\t\t\t\t\t\tnodeVar1 = nodeVar1.xzy;\n\t\t\t\t\t\tnodeVar1.xy = ( nodeVar1.xy * vec2( -1.0 ) );\n\t\t\t\t\t\t\n\n\t\t\t\t\t} else {\n\n\n\t\t\t\t\t\tif ( ( face == 5.0 ) ) {\n\n\t\t\t\t\t\t\tnodeVar1.z = ( nodeVar1.z * -1.0 );\n\t\t\t\t\t\t\t\n\n\t\t\t\t\t\t}\n\n\t\t\t\t\t\t\n\n\t\t\t\t\t}\n\n\t\t\t\t\t\n\n\t\t\t\t}\n\n\t\t\t\t\n\n\t\t\t}\n\n\t\t\t\n\n\t\t}\n\n\t\t\n\n\t}\n\n\n\treturn nodeVar1;\n\n}\n\n\n\nvoid main() {\n\n\t// flow\n\t// code\n\n\tnodeVar0 = normalize( getDirection( nodeVarying4, nodeVarying5 ) );\n\tnodeVar1 = vec3( nodeVar0.x, nodeVar0.y, nodeVar0.z );\n\tnodeVar2 = vec2( ( ( atan( nodeVar1.z, nodeVar1.x ) * 0.15915494309189535 ) + 0.5 ), ( ( asin( clamp( nodeVar1.y, -1.0, 1.0 ) ) * 0.3183098861837907 ) + 0.5 ) );\n\tnodeVar4 = bool( nodeUniform1 );\n\n\tif ( nodeVar4 ) {\n\n\t\tnodeVar5 = nodeVar2;\n\t\tnodeVar3 = vec2( nodeVar5.x, 1.0 - nodeVar5.y );\n\n\t} else {\n\n\t\tnodeVar3 = nodeVar2;\n\n\t}\n\n\tnodeVar6 = textureLod( nodeUniform0, nodeVar3, 0.0 );\n\n\t// result\n\tfragColor = nodeVar6;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\n\n\n\n\n// uniforms\n\nlayout( std140 ) uniform render {\n\tmat4 cameraProjectionMatrix;\n\tmat4 cameraViewMatrix;\n};\n\nlayout( std140 ) uniform object {\n\tfloat nodeUniform0;\n\tfloat nodeUniform1;\n\tuint nodeUniform3;\n\tuint nodeUniform4;\n\tmat4 nodeUniform7;\n};\n\n\n// varyings\nvec4 v_modelViewProjection;\nvec3 v_positionView;\nvec3 positionLocal;\nvec4 VERTEX_v_modelViewProjection;\nout vec2 nodeVarying4;\nout float nodeVarying5;\n\n\n// attributes\nlayout( location = 0 ) in vec2 uv;\nlayout( location = 1 ) in float faceIndex;\nlayout( location = 2 ) in vec3 position;\n\n\n// vars\nmat4 modelViewMatrix;\nvec4 VERTEX_nodeVar42;\n\n// codes\n\n\nvoid main() {\n\n\t// transforms\n\t\n\n\t// flow\n\t// code\n\n\tnodeVarying4 = uv;\n\tnodeVarying5 = faceIndex;\n\tmodelViewMatrix = ( cameraViewMatrix * nodeUniform7 );\n\tpositionLocal = position;\n\tv_positionView = ( modelViewMatrix * vec4( positionLocal, 1.0 ) ).xyz;\n\tVERTEX_nodeVar42 = ( cameraProjectionMatrix * vec4( v_positionView, 1.0 ) );\n\tVERTEX_v_modelViewProjection = VERTEX_nodeVar42;\n\n\t// result\n\tgl_Position = VERTEX_v_modelViewProjection;\n\n\tgl_PointSize = 1.0;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\nlayout( location = 0 ) out vec4 fragColor;\n\n\n\n// uniforms\n\nlayout( std140 ) uniform object {\n\tfloat nodeUniform0;\n\tfloat nodeUniform1;\n\tuint nodeUniform3;\n\tuint nodeUniform4;\n\tmat4 nodeUniform7;\n};\nuniform sampler2D nodeUniform2;\n\n// varyings\nin vec2 nodeVarying4;\nin float nodeVarying5;\n\n\n// vars\nvec3 nodeVar0;\nvec3 nodeVar1;\nvec3 nodeVar2;\nfloat nodeVar3;\nfloat nodeVar4;\nfloat nodeVar5;\nfloat nodeVar6;\nfloat nodeVar7;\nvec2 nodeVar8;\nvec2 nodeVar9;\nvec2 nodeVar10;\nbool nodeVar11;\nvec2 nodeVar12;\nvec4 nodeVar13;\nvec3 nodeVar14;\nvec3 nodeVar15;\nvec3 nodeVar16;\nfloat nodeVar17;\nvec3 nodeVar18;\nvec3 nodeVar19;\nuint nodeVar20;\nvec2 nodeVar21;\nfloat nodeVar22;\nfloat nodeVar23;\nfloat nodeVar24;\nfloat nodeVar25;\nfloat nodeVar26;\nvec3 nodeVar27;\nvec3 nodeVar28;\nvec3 nodeVar29;\nvec3 nodeVar30;\nfloat nodeVar31;\nfloat nodeVar32;\nfloat nodeVar33;\nfloat nodeVar34;\nfloat nodeVar35;\nvec2 nodeVar36;\nvec2 nodeVar37;\nvec2 nodeVar38;\nbool nodeVar39;\nvec2 nodeVar40;\nvec4 nodeVar41;\n\n// codes\nvec3 getDirection ( vec2 uv, float face ) {\n\n\tvec2 nodeVar0;\n\tvec3 nodeVar1;\n\n\tnodeVar0 = uv;\n\tnodeVar0 = ( ( vec2( 2.0 ) * nodeVar0 ) - vec2( 1.0 ) );\n\tnodeVar1 = vec3( nodeVar0, 1.0 );\n\n\tif ( ( face == 0.0 ) ) {\n\n\t\tnodeVar1 = nodeVar1.zyx;\n\t\t\n\n\t} else {\n\n\n\t\tif ( ( face == 1.0 ) ) {\n\n\t\t\tnodeVar1 = nodeVar1.xzy;\n\t\t\tnodeVar1.xz = ( nodeVar1.xz * vec2( -1.0 ) );\n\t\t\t\n\n\t\t} else {\n\n\n\t\t\tif ( ( face == 2.0 ) ) {\n\n\t\t\t\tnodeVar1.x = ( nodeVar1.x * -1.0 );\n\t\t\t\t\n\n\t\t\t} else {\n\n\n\t\t\t\tif ( ( face == 3.0 ) ) {\n\n\t\t\t\t\tnodeVar1 = nodeVar1.zyx;\n\t\t\t\t\tnodeVar1.xz = ( nodeVar1.xz * vec2( -1.0 ) );\n\t\t\t\t\t\n\n\t\t\t\t} else {\n\n\n\t\t\t\t\tif ( ( face == 4.0 ) ) {\n\n\t\t\t\t\t\tnodeVar1 = nodeVar1.xzy;\n\t\t\t\t\t\tnodeVar1.xy = ( nodeVar1.xy * vec2( -1.0 ) );\n\t\t\t\t\t\t\n\n\t\t\t\t\t} else {\n\n\n\t\t\t\t\t\tif ( ( face == 5.0 ) ) {\n\n\t\t\t\t\t\t\tnodeVar1.z = ( nodeVar1.z * -1.0 );\n\t\t\t\t\t\t\t\n\n\t\t\t\t\t\t}\n\n\t\t\t\t\t\t\n\n\t\t\t\t\t}\n\n\t\t\t\t\t\n\n\t\t\t\t}\n\n\t\t\t\t\n\n\t\t\t}\n\n\t\t\t\n\n\t\t}\n\n\t\t\n\n\t}\n\n\n\treturn nodeVar1;\n\n}\n\nfloat getFace ( vec3 direction ) {\n\n\tvec3 nodeVar0;\n\tfloat nodeVar1;\n\tfloat nodeVar2;\n\tfloat nodeVar3;\n\tfloat nodeVar4;\n\tfloat nodeVar5;\n\n\tnodeVar0 = abs( direction );\n\tnodeVar1 = -1.0;\n\n\tif ( ( nodeVar0.x > nodeVar0.z ) ) {\n\n\n\t\tif ( ( nodeVar0.x > nodeVar0.y ) ) {\n\n\n\t\t\tif ( ( direction.x > 0.0 ) ) {\n\n\t\t\t\tnodeVar2 = 0.0;\n\n\t\t\t} else {\n\n\t\t\t\tnodeVar2 = 3.0;\n\n\t\t\t}\n\n\t\t\tnodeVar1 = nodeVar2;\n\t\t\t\n\n\t\t} else {\n\n\n\t\t\tif ( ( direction.y > 0.0 ) ) {\n\n\t\t\t\tnodeVar3 = 1.0;\n\n\t\t\t} else {\n\n\t\t\t\tnodeVar3 = 4.0;\n\n\t\t\t}\n\n\t\t\tnodeVar1 = nodeVar3;\n\t\t\t\n\n\t\t}\n\n\t\t\n\n\t} else {\n\n\n\t\tif ( ( nodeVar0.z > nodeVar0.y ) ) {\n\n\n\t\t\tif ( ( direction.z > 0.0 ) ) {\n\n\t\t\t\tnodeVar4 = 2.0;\n\n\t\t\t} else {\n\n\t\t\t\tnodeVar4 = 5.0;\n\n\t\t\t}\n\n\t\t\tnodeVar1 = nodeVar4;\n\t\t\t\n\n\t\t} else {\n\n\n\t\t\tif ( ( direction.y > 0.0 ) ) {\n\n\t\t\t\tnodeVar5 = 1.0;\n\n\t\t\t} else {\n\n\t\t\t\tnodeVar5 = 4.0;\n\n\t\t\t}\n\n\t\t\tnodeVar1 = nodeVar5;\n\t\t\t\n\n\t\t}\n\n\t\t\n\n\t}\n\n\n\treturn nodeVar1;\n\n}\n\nvec2 getUV ( vec3 direction, float face ) {\n\n\tvec2 nodeVar0;\n\n\tnodeVar0 = vec2( 0.0, 0.0 );\n\n\tif ( ( face == 0.0 ) ) {\n\n\t\tnodeVar0 = ( vec2( direction.z, direction.y ) / vec2( abs( direction.x ) ) );\n\t\t\n\n\t} else {\n\n\n\t\tif ( ( face == 1.0 ) ) {\n\n\t\t\tnodeVar0 = ( vec2( ( - direction.x ), ( - direction.z ) ) / vec2( abs( direction.y ) ) );\n\t\t\t\n\n\t\t} else {\n\n\n\t\t\tif ( ( face == 2.0 ) ) {\n\n\t\t\t\tnodeVar0 = ( vec2( ( - direction.x ), direction.y ) / vec2( abs( direction.z ) ) );\n\t\t\t\t\n\n\t\t\t} else {\n\n\n\t\t\t\tif ( ( face == 3.0 ) ) {\n\n\t\t\t\t\tnodeVar0 = ( vec2( ( - direction.z ), direction.y ) / vec2( abs( direction.x ) ) );\n\t\t\t\t\t\n\n\t\t\t\t} else {\n\n\n\t\t\t\t\tif ( ( face == 4.0 ) ) {\n\n\t\t\t\t\t\tnodeVar0 = ( vec2( ( - direction.x ), direction.z ) / vec2( abs( direction.y ) ) );\n\t\t\t\t\t\t\n\n\t\t\t\t\t} else {\n\n\t\t\t\t\t\tnodeVar0 = ( vec2( direction.x, direction.y ) / vec2( abs( direction.z ) ) );\n\t\t\t\t\t\t\n\n\t\t\t\t\t}\n\n\t\t\t\t\t\n\n\t\t\t\t}\n\n\t\t\t\t\n\n\t\t\t}\n\n\t\t\t\n\n\t\t}\n\n\t\t\n\n\t}\n\n\n\treturn ( vec2( 0.5 ) * ( nodeVar0 + vec2( 1.0 ) ) );\n\n}\n\n\n\nvoid main() {\n\n\t// flow\n\t// code\n\n\tnodeVar0 = normalize( getDirection( nodeVarying4, nodeVarying5 ) );\n\tnodeVar1 = vec3( nodeVar0.x, nodeVar0.y, nodeVar0.z );\n\tnodeVar2 = vec3( 0.0, 0.0, 0.0 );\n\tnodeVar3 = 0.0;\n\n\tif ( ( nodeUniform0 < 0.001 ) ) {\n\n\t\tnodeVar4 = nodeUniform1;\n\t\tnodeVar5 = getFace( nodeVar1 );\n\t\tnodeVar6 = max( ( 4.0 - nodeVar4 ), 0.0 );\n\t\tnodeVar4 = max( nodeVar4, 4.0 );\n\t\tnodeVar7 = exp2( nodeVar4 );\n\t\tnodeVar8 = ( ( getUV( nodeVar1, nodeVar5 ) * vec2( ( nodeVar7 - 2.0 ) ) ) + vec2( 1.0 ) );\n\n\t\tif ( ( nodeVar5 > 2.0 ) ) {\n\n\t\t\tnodeVar8.y = ( nodeVar8.y + nodeVar7 );\n\t\t\tnodeVar5 = ( nodeVar5 - 3.0 );\n\t\t\t\n\n\t\t}\n\n\t\tnodeVar8.x = ( nodeVar8.x + ( nodeVar5 * nodeVar7 ) );\n\t\tnodeVar8.x = ( nodeVar8.x + ( nodeVar6 * ( 3.0 * 16.0 ) ) );\n\t\tnodeVar8.y = ( nodeVar8.y + ( 4.0 * ( exp2( 9.0 ) - nodeVar7 ) ) );\n\t\tnodeVar8.x = ( nodeVar8.x * 0.0006510416666666666 );\n\t\tnodeVar8.y = ( nodeVar8.y * 0.00048828125 );\n\t\tnodeVar9 = nodeVar8;\n\t\tnodeVar11 = bool( nodeUniform3 );\n\n\t\tif ( nodeVar11 ) {\n\n\t\t\tnodeVar12 = nodeVar9;\n\t\t\tnodeVar10 = vec2( nodeVar12.x, 1.0 - nodeVar12.y );\n\n\t\t} else {\n\n\t\t\tnodeVar10 = nodeVar9;\n\n\t\t}\n\n\t\tnodeVar13 = textureGrad( nodeUniform2, nodeVar10, vec2( 0.0, 0.0 ), vec2( 0.0, 0.0 ) );\n\t\tnodeVar2 = nodeVar13.xyz;\n\t\t\n\n\t} else {\n\n\n\t\tif ( ( abs( nodeVar1.z ) < 0.999 ) ) {\n\n\t\t\tnodeVar14 = vec3( 0.0, 0.0, 1.0 );\n\n\t\t} else {\n\n\t\t\tnodeVar14 = vec3( 1.0, 0.0, 0.0 );\n\n\t\t}\n\n\t\tnodeVar15 = normalize( cross( nodeVar14, nodeVar1 ) );\n\t\tnodeVar16 = cross( nodeVar1, nodeVar15 );\n\n\t\tfor ( int i = 0; i < 512; i ++ ) {\n\n\t\t\tnodeVar17 = ( nodeUniform0 * nodeUniform0 );\n\t\t\tnodeVar18 = vec3( 1.0, 0.0, 0.0 );\n\t\t\tnodeVar19 = cross( vec3( 0.0, 0.0, 1.0 ), nodeVar18 );\n\t\t\tnodeVar20 = uint( i );\n\t\t\tnodeVar20 = ( ( nodeVar20 << 16u ) | ( nodeVar20 >> 16u ) );\n\t\t\tnodeVar20 = ( ( ( nodeVar20 & 1431655765u ) << 1u ) | ( ( nodeVar20 & 2863311530u ) >> 1u ) );\n\t\t\tnodeVar20 = ( ( ( nodeVar20 & 858993459u ) << 2u ) | ( ( nodeVar20 & 3435973836u ) >> 2u ) );\n\t\t\tnodeVar20 = ( ( ( nodeVar20 & 252645135u ) << 4u ) | ( ( nodeVar20 & 4042322160u ) >> 4u ) );\n\t\t\tnodeVar20 = ( ( ( nodeVar20 & 16711935u ) << 8u ) | ( ( nodeVar20 & 4278255360u ) >> 8u ) );\n\t\t\tnodeVar21 = vec2( ( float( i ) / 512.0 ), ( float( nodeVar20 ) * 2.3283064365386963e-10 ) );\n\t\t\tnodeVar22 = sqrt( nodeVar21.x );\n\t\t\tnodeVar23 = ( ( 2.0 * 3.14159265359 ) * nodeVar21.y );\n\t\t\tnodeVar24 = ( nodeVar22 * cos( nodeVar23 ) );\n\t\t\tnodeVar25 = ( nodeVar22 * sin( nodeVar23 ) );\n\t\t\tnodeVar26 = ( 0.5 * ( vec3( 0.0, 0.0, 1.0 ).z + 1.0 ) );\n\t\t\tnodeVar25 = ( ( ( 1.0 - nodeVar26 ) * sqrt( ( 1.0 - ( nodeVar24 * nodeVar24 ) ) ) ) + ( nodeVar26 * nodeVar25 ) );\n\t\t\tnodeVar27 = ( ( ( nodeVar18 * vec3( nodeVar24 ) ) + ( nodeVar19 * vec3( nodeVar25 ) ) ) + ( vec3( 0.0, 0.0, 1.0 ) * vec3( sqrt( max( 0.0, ( 1.0 - ( ( nodeVar24 * nodeVar24 ) + ( nodeVar25 * nodeVar25 ) ) ) ) ) ) ) );\n\t\t\tnodeVar28 = normalize( vec3( ( nodeVar17 * nodeVar27.x ), ( nodeVar17 * nodeVar27.y ), max( 0.0, nodeVar27.z ) ) );\n\t\t\tnodeVar29 = normalize( ( ( ( nodeVar15 * vec3( nodeVar28.x ) ) + ( nodeVar16 * vec3( nodeVar28.y ) ) ) + ( nodeVar1 * vec3( nodeVar28.z ) ) ) );\n\t\t\tnodeVar30 = normalize( ( ( nodeVar29 * vec3( ( dot( nodeVar1, nodeVar29 ) * 2.0 ) ) ) - nodeVar1 ) );\n\t\t\tnodeVar31 = max( dot( nodeVar1, nodeVar30 ), 0.0 );\n\n\t\t\tif ( ( nodeVar31 > 0.0 ) ) {\n\n\t\t\t\tnodeVar32 = nodeUniform1;\n\t\t\t\tnodeVar33 = getFace( nodeVar30 );\n\t\t\t\tnodeVar34 = max( ( 4.0 - nodeVar32 ), 0.0 );\n\t\t\t\tnodeVar32 = max( nodeVar32, 4.0 );\n\t\t\t\tnodeVar35 = exp2( nodeVar32 );\n\t\t\t\tnodeVar36 = ( ( getUV( nodeVar30, nodeVar33 ) * vec2( ( nodeVar35 - 2.0 ) ) ) + vec2( 1.0 ) );\n\n\t\t\t\tif ( ( nodeVar33 > 2.0 ) ) {\n\n\t\t\t\t\tnodeVar36.y = ( nodeVar36.y + nodeVar35 );\n\t\t\t\t\tnodeVar33 = ( nodeVar33 - 3.0 );\n\t\t\t\t\t\n\n\t\t\t\t}\n\n\t\t\t\tnodeVar36.x = ( nodeVar36.x + ( nodeVar33 * nodeVar35 ) );\n\t\t\t\tnodeVar36.x = ( nodeVar36.x + ( nodeVar34 * ( 3.0 * 16.0 ) ) );\n\t\t\t\tnodeVar36.y = ( nodeVar36.y + ( 4.0 * ( exp2( 9.0 ) - nodeVar35 ) ) );\n\t\t\t\tnodeVar36.x = ( nodeVar36.x * 0.0006510416666666666 );\n\t\t\t\tnodeVar36.y = ( nodeVar36.y * 0.00048828125 );\n\t\t\t\tnodeVar37 = nodeVar36;\n\t\t\t\tnodeVar39 = bool( nodeUniform4 );\n\n\t\t\t\tif ( nodeVar39 ) {\n\n\t\t\t\t\tnodeVar40 = nodeVar37;\n\t\t\t\t\tnodeVar38 = vec2( nodeVar40.x, 1.0 - nodeVar40.y );\n\n\t\t\t\t} else {\n\n\t\t\t\t\tnodeVar38 = nodeVar37;\n\n\t\t\t\t}\n\n\t\t\t\tnodeVar41 = textureGrad( nodeUniform2, nodeVar38, vec2( 0.0, 0.0 ), vec2( 0.0, 0.0 ) );\n\t\t\t\tnodeVar2 = ( vec4( nodeVar2, 1.0 ) + ( nodeVar41 * vec4( nodeVar31 ) ) ).xyz;\n\t\t\t\tnodeVar3 = ( nodeVar3 + nodeVar31 );\n\t\t\t\t\n\n\t\t\t}\n\n\n\t\t}\n\n\n\t\tif ( ( nodeVar3 > 0.0 ) ) {\n\n\t\t\tnodeVar2 = ( nodeVar2 / vec3( nodeVar3 ) );\n\t\t\t\n\n\t\t}\n\n\t\t\n\n\t}\n\n\n\t// result\n\tfragColor = vec4( nodeVar2, 1.0 );\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\n\n\n\n\n// uniforms\n\nlayout( std140 ) uniform render {\n\tmat4 cameraProjectionMatrix;\n\tmat4 cameraViewMatrix;\n};\n\nlayout( std140 ) uniform object {\n\tfloat nodeUniform0;\n\tmat4 nodeUniform3;\n};\n\n\n// varyings\nvec4 v_modelViewProjection;\nvec3 v_positionView;\nvec3 positionLocal;\nvec4 VERTEX_v_modelViewProjection;\n\n\n// attributes\nlayout( location = 0 ) in vec3 position;\n\n\n// vars\nmat4 modelViewMatrix;\nvec4 VERTEX_nodeVar1;\n\n// codes\n\n\nvoid main() {\n\n\t// transforms\n\t\n\n\t// flow\n\t// code\n\n\tmodelViewMatrix = ( cameraViewMatrix * nodeUniform3 );\n\tpositionLocal = position;\n\tv_positionView = ( modelViewMatrix * vec4( positionLocal, 1.0 ) ).xyz;\n\tVERTEX_nodeVar1 = ( cameraProjectionMatrix * vec4( v_positionView, 1.0 ) );\n\tVERTEX_v_modelViewProjection = VERTEX_nodeVar1;\n\n\t// result\n\tgl_Position = VERTEX_v_modelViewProjection;\n\n\tgl_PointSize = 1.0;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\nlayout( location = 0 ) out vec4 fragColor;\n\n\n\n// uniforms\n\nlayout( std140 ) uniform object {\n\tfloat nodeUniform0;\n\tmat4 nodeUniform3;\n};\n\n\n// varyings\n\n\n// vars\nvec4 DiffuseColor;\nvec4 Output;\nvec4 nodeVar0;\n\n// codes\n\n\nvoid main() {\n\n\t// flow\n\t// code\n\n\tDiffuseColor = vec4( 0.0, 0.0, 0.0, 1.0 );\n\tDiffuseColor.w = ( DiffuseColor.w * nodeUniform0 );\n\tnodeVar0 = max( vec4( DiffuseColor.xyz, DiffuseColor.w ), 0.0 );\n\tOutput = nodeVar0;\n\n\t// result\n\tfragColor = nodeVar0;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\n\n\n\n\n// uniforms\n\nlayout( std140 ) uniform render {\n\tmat4 cameraProjectionMatrix;\n\tmat4 cameraViewMatrix;\n};\n\nlayout( std140 ) uniform object {\n\tmat3 nodeUniform1;\n\tuint nodeUniform2;\n\tfloat nodeUniform3;\n\tmat4 nodeUniform6;\n};\n\n\n// varyings\nvec4 v_modelViewProjection;\nvec3 v_positionView;\nvec3 positionLocal;\nvec4 VERTEX_v_modelViewProjection;\nout vec2 nodeVarying4;\n\n\n// attributes\nlayout( location = 0 ) in vec2 uv;\nlayout( location = 1 ) in vec3 position;\n\n\n// vars\nmat4 modelViewMatrix;\nvec4 VERTEX_nodeVar5;\n\n// codes\n\n\nvoid main() {\n\n\t// transforms\n\t\n\n\t// flow\n\t// code\n\n\tnodeVarying4 = uv;\n\tmodelViewMatrix = ( cameraViewMatrix * nodeUniform6 );\n\tpositionLocal = position;\n\tv_positionView = ( modelViewMatrix * vec4( positionLocal, 1.0 ) ).xyz;\n\tVERTEX_nodeVar5 = ( cameraProjectionMatrix * vec4( v_positionView, 1.0 ) );\n\tVERTEX_v_modelViewProjection = VERTEX_nodeVar5;\n\n\t// result\n\tgl_Position = VERTEX_v_modelViewProjection;\n\n\tgl_PointSize = 1.0;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\nlayout( location = 0 ) out float fragColor;\n\n\n\n// uniforms\n\nlayout( std140 ) uniform object {\n\tmat3 nodeUniform1;\n\tuint nodeUniform2;\n\tfloat nodeUniform3;\n\tmat4 nodeUniform6;\n};\nuniform sampler2D nodeUniform0;\n\n// varyings\nin vec2 nodeVarying4;\n\n\n// vars\nvec2 nodeVar0;\nvec2 nodeVar1;\nbool nodeVar2;\nvec2 nodeVar3;\nvec4 nodeVar4;\n\n// codes\n\n\nvoid main() {\n\n\t// flow\n\t// code\n\n\tnodeVar0 = ( nodeUniform1 * vec3( nodeVarying4, 1.0 ) ).xy;\n\tnodeVar2 = bool( nodeUniform2 );\n\n\tif ( nodeVar2 ) {\n\n\t\tnodeVar3 = nodeVar0;\n\t\tnodeVar1 = vec2( nodeVar3.x, 1.0 - nodeVar3.y );\n\n\t} else {\n\n\t\tnodeVar1 = nodeVar0;\n\n\t}\n\n\tnodeVar4 = texture( nodeUniform0, nodeVar1 );\n\n\t// result\n\tfragColor = ( nodeVar4 * vec4( nodeUniform3 ) ).x;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\n\n\n\n\n// uniforms\n\nlayout( std140 ) uniform render {\n\tmat4 cameraProjectionMatrix;\n\tmat4 cameraViewMatrix;\n};\n\nlayout( std140 ) uniform object {\n\tvec2 nodeUniform0;\n\tfloat nodeUniform1;\n\tmat3 nodeUniform3;\n\tuint nodeUniform4;\n\tmat3 nodeUniform5;\n\tuint nodeUniform6;\n\tmat3 nodeUniform7;\n\tuint nodeUniform8;\n\tmat3 nodeUniform9;\n\tuint nodeUniform10;\n\tmat4 nodeUniform13;\n};\n\n\n// varyings\nvec4 v_modelViewProjection;\nvec3 v_positionView;\nvec3 positionLocal;\nvec4 VERTEX_v_modelViewProjection;\nout vec2 nodeVarying4;\n\n\n// attributes\nlayout( location = 0 ) in vec2 uv;\nlayout( location = 1 ) in vec3 position;\n\n\n// vars\nmat4 modelViewMatrix;\nvec4 VERTEX_nodeVar30;\n\n// codes\n\n\nvoid main() {\n\n\t// transforms\n\t\n\n\t// flow\n\t// code\n\n\tnodeVarying4 = uv;\n\tmodelViewMatrix = ( cameraViewMatrix * nodeUniform13 );\n\tpositionLocal = position;\n\tv_positionView = ( modelViewMatrix * vec4( positionLocal, 1.0 ) ).xyz;\n\tVERTEX_nodeVar30 = ( cameraProjectionMatrix * vec4( v_positionView, 1.0 ) );\n\tVERTEX_v_modelViewProjection = VERTEX_nodeVar30;\n\n\t// result\n\tgl_Position = VERTEX_v_modelViewProjection;\n\n\tgl_PointSize = 1.0;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\nlayout( location = 0 ) out float fragColor;\n\n\n\n// uniforms\n\nlayout( std140 ) uniform object {\n\tvec2 nodeUniform0;\n\tfloat nodeUniform1;\n\tmat3 nodeUniform3;\n\tuint nodeUniform4;\n\tmat3 nodeUniform5;\n\tuint nodeUniform6;\n\tmat3 nodeUniform7;\n\tuint nodeUniform8;\n\tmat3 nodeUniform9;\n\tuint nodeUniform10;\n\tmat4 nodeUniform13;\n};\nuniform sampler2D nodeUniform2;\n\n// varyings\nin vec2 nodeVarying4;\n\n\n// vars\nvec2 nodeVar0;\nvec2 nodeVar1;\nvec2 nodeVar2;\nvec2 nodeVar3;\nvec2 nodeVar4;\nvec2 nodeVar5;\nvec2 nodeVar6;\nvec2 nodeVar7;\nbool nodeVar8;\nvec2 nodeVar9;\nvec4 nodeVar10;\nfloat nodeVar11;\nvec2 nodeVar12;\nvec2 nodeVar13;\nbool nodeVar14;\nvec2 nodeVar15;\nvec4 nodeVar16;\nfloat nodeVar17;\nvec2 nodeVar18;\nvec2 nodeVar19;\nbool nodeVar20;\nvec2 nodeVar21;\nvec4 nodeVar22;\nfloat nodeVar23;\nvec2 nodeVar24;\nvec2 nodeVar25;\nbool nodeVar26;\nvec2 nodeVar27;\nvec4 nodeVar28;\nfloat nodeVar29;\n\n// codes\n\n\nvoid main() {\n\n\t// flow\n\t// code\n\n\tnodeVar0 = ( ( vec2( 1.0, 1.0 ) / nodeUniform0 ) * vec2( nodeUniform1 ) );\n\tnodeVar1 = ( vec2( 0.5, 0.5 ) / nodeUniform0 );\n\tnodeVar2 = clamp( ( nodeVarying4 - vec2( nodeVar0.x, 0.0 ) ), nodeVar1, ( vec2( 1.0, 1.0 ) - nodeVar1 ) );\n\tnodeVar3 = clamp( ( nodeVarying4 + vec2( nodeVar0.x, 0.0 ) ), nodeVar1, ( vec2( 1.0, 1.0 ) - nodeVar1 ) );\n\tnodeVar4 = clamp( ( nodeVarying4 - vec2( 0.0, nodeVar0.y ) ), nodeVar1, ( vec2( 1.0, 1.0 ) - nodeVar1 ) );\n\tnodeVar5 = clamp( ( nodeVarying4 + vec2( 0.0, nodeVar0.y ) ), nodeVar1, ( vec2( 1.0, 1.0 ) - nodeVar1 ) );\n\tnodeVar6 = ( nodeUniform3 * vec3( nodeVar2, 1.0 ) ).xy;\n\tnodeVar8 = bool( nodeUniform4 );\n\n\tif ( nodeVar8 ) {\n\n\t\tnodeVar9 = nodeVar6;\n\t\tnodeVar7 = vec2( nodeVar9.x, 1.0 - nodeVar9.y );\n\n\t} else {\n\n\t\tnodeVar7 = nodeVar6;\n\n\t}\n\n\tnodeVar10 = texture( nodeUniform2, nodeVar7 );\n\tnodeVar11 = nodeVar10.x;\n\tnodeVar12 = ( nodeUniform5 * vec3( nodeVar3, 1.0 ) ).xy;\n\tnodeVar14 = bool( nodeUniform6 );\n\n\tif ( nodeVar14 ) {\n\n\t\tnodeVar15 = nodeVar12;\n\t\tnodeVar13 = vec2( nodeVar15.x, 1.0 - nodeVar15.y );\n\n\t} else {\n\n\t\tnodeVar13 = nodeVar12;\n\n\t}\n\n\tnodeVar16 = texture( nodeUniform2, nodeVar13 );\n\tnodeVar17 = nodeVar16.x;\n\tnodeVar18 = ( nodeUniform7 * vec3( nodeVar5, 1.0 ) ).xy;\n\tnodeVar20 = bool( nodeUniform8 );\n\n\tif ( nodeVar20 ) {\n\n\t\tnodeVar21 = nodeVar18;\n\t\tnodeVar19 = vec2( nodeVar21.x, 1.0 - nodeVar21.y );\n\n\t} else {\n\n\t\tnodeVar19 = nodeVar18;\n\n\t}\n\n\tnodeVar22 = texture( nodeUniform2, nodeVar19 );\n\tnodeVar23 = nodeVar22.y;\n\tnodeVar24 = ( nodeUniform9 * vec3( nodeVar4, 1.0 ) ).xy;\n\tnodeVar26 = bool( nodeUniform10 );\n\n\tif ( nodeVar26 ) {\n\n\t\tnodeVar27 = nodeVar24;\n\t\tnodeVar25 = vec2( nodeVar27.x, 1.0 - nodeVar27.y );\n\n\t} else {\n\n\t\tnodeVar25 = nodeVar24;\n\n\t}\n\n\tnodeVar28 = texture( nodeUniform2, nodeVar25 );\n\tnodeVar29 = nodeVar28.y;\n\n\t// result\n\tfragColor = vec4( ( 0.5 * ( ( ( nodeVar17 - nodeVar11 ) + nodeVar23 ) - nodeVar29 ) ), 0.0, 0.0, 1.0 ).x;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\n\n\n\n\n// uniforms\n\nlayout( std140 ) uniform render {\n\tmat4 cameraProjectionMatrix;\n\tmat4 cameraViewMatrix;\n};\n\nlayout( std140 ) uniform object {\n\tfloat nodeUniform0;\n\tmat3 nodeUniform2;\n\tvec2 nodeUniform3;\n\tfloat nodeUniform4;\n\tuint nodeUniform5;\n\tmat3 nodeUniform6;\n\tuint nodeUniform7;\n\tmat3 nodeUniform8;\n\tuint nodeUniform9;\n\tmat3 nodeUniform10;\n\tuint nodeUniform11;\n\tmat3 nodeUniform13;\n\tuint nodeUniform14;\n\tmat4 nodeUniform17;\n};\n\n\n// varyings\nvec4 v_modelViewProjection;\nvec3 v_positionView;\nvec3 positionLocal;\nvec4 VERTEX_v_modelViewProjection;\nout vec2 nodeVarying4;\n\n\n// attributes\nlayout( location = 0 ) in vec2 uv;\nlayout( location = 1 ) in vec3 position;\n\n\n// vars\nmat4 modelViewMatrix;\nvec4 VERTEX_nodeVar27;\n\n// codes\n\n\nvoid main() {\n\n\t// transforms\n\t\n\n\t// flow\n\t// code\n\n\tnodeVarying4 = uv;\n\tmodelViewMatrix = ( cameraViewMatrix * nodeUniform17 );\n\tpositionLocal = position;\n\tv_positionView = ( modelViewMatrix * vec4( positionLocal, 1.0 ) ).xyz;\n\tVERTEX_nodeVar27 = ( cameraProjectionMatrix * vec4( v_positionView, 1.0 ) );\n\tVERTEX_v_modelViewProjection = VERTEX_nodeVar27;\n\n\t// result\n\tgl_Position = VERTEX_v_modelViewProjection;\n\n\tgl_PointSize = 1.0;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\nlayout( location = 0 ) out float fragColor;\n\n\n\n// uniforms\n\nlayout( std140 ) uniform object {\n\tfloat nodeUniform0;\n\tmat3 nodeUniform2;\n\tvec2 nodeUniform3;\n\tfloat nodeUniform4;\n\tuint nodeUniform5;\n\tmat3 nodeUniform6;\n\tuint nodeUniform7;\n\tmat3 nodeUniform8;\n\tuint nodeUniform9;\n\tmat3 nodeUniform10;\n\tuint nodeUniform11;\n\tmat3 nodeUniform13;\n\tuint nodeUniform14;\n\tmat4 nodeUniform17;\n};\nuniform sampler2D nodeUniform1;\nuniform sampler2D nodeUniform12;\n\n// varyings\nin vec2 nodeVarying4;\n\n\n// vars\nvec2 nodeVar0;\nvec2 nodeVar1;\nvec2 nodeVar2;\nvec2 nodeVar3;\nbool nodeVar4;\nvec2 nodeVar5;\nvec4 nodeVar6;\nvec2 nodeVar7;\nvec2 nodeVar8;\nbool nodeVar9;\nvec2 nodeVar10;\nvec4 nodeVar11;\nvec2 nodeVar12;\nvec2 nodeVar13;\nbool nodeVar14;\nvec2 nodeVar15;\nvec4 nodeVar16;\nvec2 nodeVar17;\nvec2 nodeVar18;\nbool nodeVar19;\nvec2 nodeVar20;\nvec4 nodeVar21;\nvec2 nodeVar22;\nvec2 nodeVar23;\nbool nodeVar24;\nvec2 nodeVar25;\nvec4 nodeVar26;\n\n// codes\n\n\nvoid main() {\n\n\t// flow\n\t// code\n\n\tnodeVar0 = ( ( vec2( 1.0, 1.0 ) / nodeUniform3 ) * vec2( nodeUniform4 ) );\n\tnodeVar1 = ( vec2( 0.5, 0.5 ) / nodeUniform3 );\n\tnodeVar2 = ( nodeUniform2 * vec3( clamp( ( nodeVarying4 - vec2( nodeVar0.x, 0.0 ) ), nodeVar1, ( vec2( 1.0, 1.0 ) - nodeVar1 ) ), 1.0 ) ).xy;\n\tnodeVar4 = bool( nodeUniform5 );\n\n\tif ( nodeVar4 ) {\n\n\t\tnodeVar5 = nodeVar2;\n\t\tnodeVar3 = vec2( nodeVar5.x, 1.0 - nodeVar5.y );\n\n\t} else {\n\n\t\tnodeVar3 = nodeVar2;\n\n\t}\n\n\tnodeVar6 = texture( nodeUniform1, nodeVar3 );\n\tnodeVar7 = ( nodeUniform6 * vec3( clamp( ( nodeVarying4 + vec2( nodeVar0.x, 0.0 ) ), nodeVar1, ( vec2( 1.0, 1.0 ) - nodeVar1 ) ), 1.0 ) ).xy;\n\tnodeVar9 = bool( nodeUniform7 );\n\n\tif ( nodeVar9 ) {\n\n\t\tnodeVar10 = nodeVar7;\n\t\tnodeVar8 = vec2( nodeVar10.x, 1.0 - nodeVar10.y );\n\n\t} else {\n\n\t\tnodeVar8 = nodeVar7;\n\n\t}\n\n\tnodeVar11 = texture( nodeUniform1, nodeVar8 );\n\tnodeVar12 = ( nodeUniform8 * vec3( clamp( ( nodeVarying4 - vec2( 0.0, nodeVar0.y ) ), nodeVar1, ( vec2( 1.0, 1.0 ) - nodeVar1 ) ), 1.0 ) ).xy;\n\tnodeVar14 = bool( nodeUniform9 );\n\n\tif ( nodeVar14 ) {\n\n\t\tnodeVar15 = nodeVar12;\n\t\tnodeVar13 = vec2( nodeVar15.x, 1.0 - nodeVar15.y );\n\n\t} else {\n\n\t\tnodeVar13 = nodeVar12;\n\n\t}\n\n\tnodeVar16 = texture( nodeUniform1, nodeVar13 );\n\tnodeVar17 = ( nodeUniform10 * vec3( clamp( ( nodeVarying4 + vec2( 0.0, nodeVar0.y ) ), nodeVar1, ( vec2( 1.0, 1.0 ) - nodeVar1 ) ), 1.0 ) ).xy;\n\tnodeVar19 = bool( nodeUniform11 );\n\n\tif ( nodeVar19 ) {\n\n\t\tnodeVar20 = nodeVar17;\n\t\tnodeVar18 = vec2( nodeVar20.x, 1.0 - nodeVar20.y );\n\n\t} else {\n\n\t\tnodeVar18 = nodeVar17;\n\n\t}\n\n\tnodeVar21 = texture( nodeUniform1, nodeVar18 );\n\tnodeVar22 = ( nodeUniform13 * vec3( nodeVarying4, 1.0 ) ).xy;\n\tnodeVar24 = bool( nodeUniform14 );\n\n\tif ( nodeVar24 ) {\n\n\t\tnodeVar25 = nodeVar22;\n\t\tnodeVar23 = vec2( nodeVar25.x, 1.0 - nodeVar25.y );\n\n\t} else {\n\n\t\tnodeVar23 = nodeVar22;\n\n\t}\n\n\tnodeVar26 = texture( nodeUniform12, nodeVar23 );\n\n\t// result\n\tfragColor = vec4( ( nodeUniform0 * ( ( ( ( nodeVar6.x + nodeVar11.x ) + nodeVar16.x ) + nodeVar21.x ) - nodeVar26.x ) ), 0.0, 0.0, 1.0 ).x;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\n\n\n\n\n// uniforms\n\nlayout( std140 ) uniform render {\n\tmat4 cameraProjectionMatrix;\n\tmat4 cameraViewMatrix;\n};\n\nlayout( std140 ) uniform object {\n\tmat3 nodeUniform1;\n\tvec2 nodeUniform2;\n\tfloat nodeUniform3;\n\tuint nodeUniform4;\n\tmat3 nodeUniform5;\n\tuint nodeUniform6;\n\tmat3 nodeUniform7;\n\tuint nodeUniform8;\n\tmat3 nodeUniform9;\n\tuint nodeUniform10;\n\tfloat nodeUniform11;\n\tmat3 nodeUniform12;\n\tuint nodeUniform13;\n\tmat3 nodeUniform15;\n\tuint nodeUniform16;\n\tfloat nodeUniform17;\n\tmat4 nodeUniform20;\n};\n\n\n// varyings\nvec4 v_modelViewProjection;\nvec3 v_positionView;\nvec3 positionLocal;\nvec4 VERTEX_v_modelViewProjection;\nout vec2 nodeVarying4;\n\n\n// attributes\nlayout( location = 0 ) in vec2 uv;\nlayout( location = 1 ) in vec3 position;\n\n\n// vars\nmat4 modelViewMatrix;\nvec4 VERTEX_nodeVar33;\n\n// codes\n\n\nvoid main() {\n\n\t// transforms\n\t\n\n\t// flow\n\t// code\n\n\tnodeVarying4 = uv;\n\tmodelViewMatrix = ( cameraViewMatrix * nodeUniform20 );\n\tpositionLocal = position;\n\tv_positionView = ( modelViewMatrix * vec4( positionLocal, 1.0 ) ).xyz;\n\tVERTEX_nodeVar33 = ( cameraProjectionMatrix * vec4( v_positionView, 1.0 ) );\n\tVERTEX_v_modelViewProjection = VERTEX_nodeVar33;\n\n\t// result\n\tgl_Position = VERTEX_v_modelViewProjection;\n\n\tgl_PointSize = 1.0;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\nlayout( location = 0 ) out vec2 fragColor;\n\n\n\n// uniforms\n\nlayout( std140 ) uniform object {\n\tmat3 nodeUniform1;\n\tvec2 nodeUniform2;\n\tfloat nodeUniform3;\n\tuint nodeUniform4;\n\tmat3 nodeUniform5;\n\tuint nodeUniform6;\n\tmat3 nodeUniform7;\n\tuint nodeUniform8;\n\tmat3 nodeUniform9;\n\tuint nodeUniform10;\n\tfloat nodeUniform11;\n\tmat3 nodeUniform12;\n\tuint nodeUniform13;\n\tmat3 nodeUniform15;\n\tuint nodeUniform16;\n\tfloat nodeUniform17;\n\tmat4 nodeUniform20;\n};\nuniform sampler2D nodeUniform0;\nuniform sampler2D nodeUniform14;\n\n// varyings\nin vec2 nodeVarying4;\n\n\n// vars\nvec2 nodeVar0;\nvec2 nodeVar1;\nvec2 nodeVar2;\nvec2 nodeVar3;\nbool nodeVar4;\nvec2 nodeVar5;\nvec4 nodeVar6;\nvec2 nodeVar7;\nvec2 nodeVar8;\nbool nodeVar9;\nvec2 nodeVar10;\nvec4 nodeVar11;\nvec2 nodeVar12;\nvec2 nodeVar13;\nbool nodeVar14;\nvec2 nodeVar15;\nvec4 nodeVar16;\nvec2 nodeVar17;\nvec2 nodeVar18;\nbool nodeVar19;\nvec2 nodeVar20;\nvec4 nodeVar21;\nvec2 nodeVar22;\nvec2 nodeVar23;\nvec2 nodeVar24;\nbool nodeVar25;\nvec2 nodeVar26;\nvec4 nodeVar27;\nvec2 nodeVar28;\nvec2 nodeVar29;\nbool nodeVar30;\nvec2 nodeVar31;\nvec4 nodeVar32;\n\n// codes\n\n\nvoid main() {\n\n\t// flow\n\t// code\n\n\tnodeVar0 = ( ( vec2( 1.0, 1.0 ) / nodeUniform2 ) * vec2( nodeUniform3 ) );\n\tnodeVar1 = ( vec2( 0.5, 0.5 ) / nodeUniform2 );\n\tnodeVar2 = ( nodeUniform1 * vec3( clamp( ( nodeVarying4 + vec2( 0.0, nodeVar0.y ) ), nodeVar1, ( vec2( 1.0, 1.0 ) - nodeVar1 ) ), 1.0 ) ).xy;\n\tnodeVar4 = bool( nodeUniform4 );\n\n\tif ( nodeVar4 ) {\n\n\t\tnodeVar5 = nodeVar2;\n\t\tnodeVar3 = vec2( nodeVar5.x, 1.0 - nodeVar5.y );\n\n\t} else {\n\n\t\tnodeVar3 = nodeVar2;\n\n\t}\n\n\tnodeVar6 = texture( nodeUniform0, nodeVar3 );\n\tnodeVar7 = ( nodeUniform5 * vec3( clamp( ( nodeVarying4 - vec2( 0.0, nodeVar0.y ) ), nodeVar1, ( vec2( 1.0, 1.0 ) - nodeVar1 ) ), 1.0 ) ).xy;\n\tnodeVar9 = bool( nodeUniform6 );\n\n\tif ( nodeVar9 ) {\n\n\t\tnodeVar10 = nodeVar7;\n\t\tnodeVar8 = vec2( nodeVar10.x, 1.0 - nodeVar10.y );\n\n\t} else {\n\n\t\tnodeVar8 = nodeVar7;\n\n\t}\n\n\tnodeVar11 = texture( nodeUniform0, nodeVar8 );\n\tnodeVar12 = ( nodeUniform7 * vec3( clamp( ( nodeVarying4 + vec2( nodeVar0.x, 0.0 ) ), nodeVar1, ( vec2( 1.0, 1.0 ) - nodeVar1 ) ), 1.0 ) ).xy;\n\tnodeVar14 = bool( nodeUniform8 );\n\n\tif ( nodeVar14 ) {\n\n\t\tnodeVar15 = nodeVar12;\n\t\tnodeVar13 = vec2( nodeVar15.x, 1.0 - nodeVar15.y );\n\n\t} else {\n\n\t\tnodeVar13 = nodeVar12;\n\n\t}\n\n\tnodeVar16 = texture( nodeUniform0, nodeVar13 );\n\tnodeVar17 = ( nodeUniform9 * vec3( clamp( ( nodeVarying4 - vec2( nodeVar0.x, 0.0 ) ), nodeVar1, ( vec2( 1.0, 1.0 ) - nodeVar1 ) ), 1.0 ) ).xy;\n\tnodeVar19 = bool( nodeUniform10 );\n\n\tif ( nodeVar19 ) {\n\n\t\tnodeVar20 = nodeVar17;\n\t\tnodeVar18 = vec2( nodeVar20.x, 1.0 - nodeVar20.y );\n\n\t} else {\n\n\t\tnodeVar18 = nodeVar17;\n\n\t}\n\n\tnodeVar21 = texture( nodeUniform0, nodeVar18 );\n\tnodeVar22 = ( vec2( ( abs( nodeVar6.x ) - abs( nodeVar11.x ) ), ( abs( nodeVar16.x ) - abs( nodeVar21.x ) ) ) * vec2( 0.5 ) );\n\tnodeVar22 = ( nodeVar22 / vec2( ( length( nodeVar22 ) + 0.0001 ) ) );\n\tnodeVar23 = ( nodeUniform12 * vec3( nodeVarying4, 1.0 ) ).xy;\n\tnodeVar25 = bool( nodeUniform13 );\n\n\tif ( nodeVar25 ) {\n\n\t\tnodeVar26 = nodeVar23;\n\t\tnodeVar24 = vec2( nodeVar26.x, 1.0 - nodeVar26.y );\n\n\t} else {\n\n\t\tnodeVar24 = nodeVar23;\n\n\t}\n\n\tnodeVar27 = texture( nodeUniform0, nodeVar24 );\n\tnodeVar22 = ( nodeVar22 * vec2( ( nodeUniform11 * clamp( nodeVar27.x, -100.0, 100.0 ) ) ) );\n\tnodeVar22.y = ( - nodeVar22.y );\n\tnodeVar28 = ( nodeUniform15 * vec3( nodeVarying4, 1.0 ) ).xy;\n\tnodeVar30 = bool( nodeUniform16 );\n\n\tif ( nodeVar30 ) {\n\n\t\tnodeVar31 = nodeVar28;\n\t\tnodeVar29 = vec2( nodeVar31.x, 1.0 - nodeVar31.y );\n\n\t} else {\n\n\t\tnodeVar29 = nodeVar28;\n\n\t}\n\n\tnodeVar32 = texture( nodeUniform14, nodeVar29 );\n\n\t// result\n\tfragColor = vec4( ( nodeVar32.xy + ( nodeVar22 * vec2( nodeUniform17 ) ) ), 0.0, 1.0 ).xy;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\n\n\n\n\n// uniforms\n\nlayout( std140 ) uniform render {\n\tmat4 cameraProjectionMatrix;\n\tmat4 cameraViewMatrix;\n};\n\nlayout( std140 ) uniform object {\n\tmat3 nodeUniform1;\n\tfloat nodeUniform2;\n\tmat3 nodeUniform4;\n\tuint nodeUniform5;\n\tvec2 nodeUniform6;\n\tuint nodeUniform7;\n\tfloat nodeUniform8;\n\tmat4 nodeUniform11;\n};\n\n\n// varyings\nvec4 v_modelViewProjection;\nvec3 v_positionView;\nvec3 positionLocal;\nvec4 VERTEX_v_modelViewProjection;\nout vec2 nodeVarying4;\n\n\n// attributes\nlayout( location = 0 ) in vec2 uv;\nlayout( location = 1 ) in vec3 position;\n\n\n// vars\nmat4 modelViewMatrix;\nvec4 VERTEX_nodeVar10;\n\n// codes\n\n\nvoid main() {\n\n\t// transforms\n\t\n\n\t// flow\n\t// code\n\n\tnodeVarying4 = uv;\n\tmodelViewMatrix = ( cameraViewMatrix * nodeUniform11 );\n\tpositionLocal = position;\n\tv_positionView = ( modelViewMatrix * vec4( positionLocal, 1.0 ) ).xyz;\n\tVERTEX_nodeVar10 = ( cameraProjectionMatrix * vec4( v_positionView, 1.0 ) );\n\tVERTEX_v_modelViewProjection = VERTEX_nodeVar10;\n\n\t// result\n\tgl_Position = VERTEX_v_modelViewProjection;\n\n\tgl_PointSize = 1.0;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\nlayout( location = 0 ) out vec4 fragColor;\n\n\n\n// uniforms\n\nlayout( std140 ) uniform object {\n\tmat3 nodeUniform1;\n\tfloat nodeUniform2;\n\tmat3 nodeUniform4;\n\tuint nodeUniform5;\n\tvec2 nodeUniform6;\n\tuint nodeUniform7;\n\tfloat nodeUniform8;\n\tmat4 nodeUniform11;\n};\nuniform sampler2D nodeUniform0;\nuniform sampler2D nodeUniform3;\n\n// varyings\nin vec2 nodeVarying4;\n\n\n// vars\nvec2 nodeVar0;\nvec2 nodeVar1;\nbool nodeVar2;\nvec2 nodeVar3;\nvec4 nodeVar4;\nvec2 nodeVar5;\nvec2 nodeVar6;\nbool nodeVar7;\nvec2 nodeVar8;\nvec4 nodeVar9;\n\n// codes\n\n\nvoid main() {\n\n\t// flow\n\t// code\n\n\tnodeVar0 = ( nodeUniform4 * vec3( nodeVarying4, 1.0 ) ).xy;\n\tnodeVar2 = bool( nodeUniform5 );\n\n\tif ( nodeVar2 ) {\n\n\t\tnodeVar3 = nodeVar0;\n\t\tnodeVar1 = vec2( nodeVar3.x, 1.0 - nodeVar3.y );\n\n\t} else {\n\n\t\tnodeVar1 = nodeVar0;\n\n\t}\n\n\tnodeVar4 = texture( nodeUniform3, nodeVar1 );\n\tnodeVar5 = ( nodeUniform1 * vec3( clamp( ( nodeVarying4 - ( vec2( nodeUniform2 ) * ( ( nodeVar4.xy * vec2( clamp( ( 500.0 / max( length( nodeVar4.xy ), 500.0 ) ), 0.0, 1.0 ) ) ) * ( vec2( 1.0, 1.0 ) / nodeUniform6 ) ) ) ), vec2( 0.0 ), vec2( 1.0 ) ), 1.0 ) ).xy;\n\tnodeVar7 = bool( nodeUniform7 );\n\n\tif ( nodeVar7 ) {\n\n\t\tnodeVar8 = nodeVar5;\n\t\tnodeVar6 = vec2( nodeVar8.x, 1.0 - nodeVar8.y );\n\n\t} else {\n\n\t\tnodeVar6 = nodeVar5;\n\n\t}\n\n\tnodeVar9 = texture( nodeUniform0, nodeVar6 );\n\n\t// result\n\tfragColor = vec4( ( nodeVar9 * vec4( nodeUniform8 ) ).xyz, 1.0 );\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\n\n\n\n\n// uniforms\n\nlayout( std140 ) uniform render {\n\tmat4 cameraProjectionMatrix;\n\tmat4 cameraViewMatrix;\n};\n\nlayout( std140 ) uniform object {\n\tmat3 nodeUniform1;\n\tvec2 nodeUniform2;\n\tfloat nodeUniform3;\n\tuint nodeUniform4;\n\tmat3 nodeUniform5;\n\tuint nodeUniform6;\n\tmat3 nodeUniform7;\n\tuint nodeUniform8;\n\tmat3 nodeUniform9;\n\tuint nodeUniform10;\n\tmat4 nodeUniform13;\n};\n\n\n// varyings\nvec4 v_modelViewProjection;\nvec3 v_positionView;\nvec3 positionLocal;\nvec4 VERTEX_v_modelViewProjection;\nout vec2 nodeVarying4;\n\n\n// attributes\nlayout( location = 0 ) in vec2 uv;\nlayout( location = 1 ) in vec3 position;\n\n\n// vars\nmat4 modelViewMatrix;\nvec4 VERTEX_nodeVar22;\n\n// codes\n\n\nvoid main() {\n\n\t// transforms\n\t\n\n\t// flow\n\t// code\n\n\tnodeVarying4 = uv;\n\tmodelViewMatrix = ( cameraViewMatrix * nodeUniform13 );\n\tpositionLocal = position;\n\tv_positionView = ( modelViewMatrix * vec4( positionLocal, 1.0 ) ).xyz;\n\tVERTEX_nodeVar22 = ( cameraProjectionMatrix * vec4( v_positionView, 1.0 ) );\n\tVERTEX_v_modelViewProjection = VERTEX_nodeVar22;\n\n\t// result\n\tgl_Position = VERTEX_v_modelViewProjection;\n\n\tgl_PointSize = 1.0;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\nlayout( location = 0 ) out float fragColor;\n\n\n\n// uniforms\n\nlayout( std140 ) uniform object {\n\tmat3 nodeUniform1;\n\tvec2 nodeUniform2;\n\tfloat nodeUniform3;\n\tuint nodeUniform4;\n\tmat3 nodeUniform5;\n\tuint nodeUniform6;\n\tmat3 nodeUniform7;\n\tuint nodeUniform8;\n\tmat3 nodeUniform9;\n\tuint nodeUniform10;\n\tmat4 nodeUniform13;\n};\nuniform sampler2D nodeUniform0;\n\n// varyings\nin vec2 nodeVarying4;\n\n\n// vars\nvec2 nodeVar0;\nvec2 nodeVar1;\nvec2 nodeVar2;\nvec2 nodeVar3;\nbool nodeVar4;\nvec2 nodeVar5;\nvec4 nodeVar6;\nvec2 nodeVar7;\nvec2 nodeVar8;\nbool nodeVar9;\nvec2 nodeVar10;\nvec4 nodeVar11;\nvec2 nodeVar12;\nvec2 nodeVar13;\nbool nodeVar14;\nvec2 nodeVar15;\nvec4 nodeVar16;\nvec2 nodeVar17;\nvec2 nodeVar18;\nbool nodeVar19;\nvec2 nodeVar20;\nvec4 nodeVar21;\n\n// codes\n\n\nvoid main() {\n\n\t// flow\n\t// code\n\n\tnodeVar0 = ( ( vec2( 1.0, 1.0 ) / nodeUniform2 ) * vec2( nodeUniform3 ) );\n\tnodeVar1 = ( vec2( 0.5, 0.5 ) / nodeUniform2 );\n\tnodeVar2 = ( nodeUniform1 * vec3( clamp( ( nodeVarying4 + vec2( nodeVar0.x, 0.0 ) ), nodeVar1, ( vec2( 1.0, 1.0 ) - nodeVar1 ) ), 1.0 ) ).xy;\n\tnodeVar4 = bool( nodeUniform4 );\n\n\tif ( nodeVar4 ) {\n\n\t\tnodeVar5 = nodeVar2;\n\t\tnodeVar3 = vec2( nodeVar5.x, 1.0 - nodeVar5.y );\n\n\t} else {\n\n\t\tnodeVar3 = nodeVar2;\n\n\t}\n\n\tnodeVar6 = texture( nodeUniform0, nodeVar3 );\n\tnodeVar7 = ( nodeUniform5 * vec3( clamp( ( nodeVarying4 - vec2( nodeVar0.x, 0.0 ) ), nodeVar1, ( vec2( 1.0, 1.0 ) - nodeVar1 ) ), 1.0 ) ).xy;\n\tnodeVar9 = bool( nodeUniform6 );\n\n\tif ( nodeVar9 ) {\n\n\t\tnodeVar10 = nodeVar7;\n\t\tnodeVar8 = vec2( nodeVar10.x, 1.0 - nodeVar10.y );\n\n\t} else {\n\n\t\tnodeVar8 = nodeVar7;\n\n\t}\n\n\tnodeVar11 = texture( nodeUniform0, nodeVar8 );\n\tnodeVar12 = ( nodeUniform7 * vec3( clamp( ( nodeVarying4 + vec2( 0.0, nodeVar0.y ) ), nodeVar1, ( vec2( 1.0, 1.0 ) - nodeVar1 ) ), 1.0 ) ).xy;\n\tnodeVar14 = bool( nodeUniform8 );\n\n\tif ( nodeVar14 ) {\n\n\t\tnodeVar15 = nodeVar12;\n\t\tnodeVar13 = vec2( nodeVar15.x, 1.0 - nodeVar15.y );\n\n\t} else {\n\n\t\tnodeVar13 = nodeVar12;\n\n\t}\n\n\tnodeVar16 = texture( nodeUniform0, nodeVar13 );\n\tnodeVar17 = ( nodeUniform9 * vec3( clamp( ( nodeVarying4 - vec2( 0.0, nodeVar0.y ) ), nodeVar1, ( vec2( 1.0, 1.0 ) - nodeVar1 ) ), 1.0 ) ).xy;\n\tnodeVar19 = bool( nodeUniform10 );\n\n\tif ( nodeVar19 ) {\n\n\t\tnodeVar20 = nodeVar17;\n\t\tnodeVar18 = vec2( nodeVar20.x, 1.0 - nodeVar20.y );\n\n\t} else {\n\n\t\tnodeVar18 = nodeVar17;\n\n\t}\n\n\tnodeVar21 = texture( nodeUniform0, nodeVar18 );\n\n\t// result\n\tfragColor = vec4( ( 0.5 * ( ( ( nodeVar6.y - nodeVar11.y ) - nodeVar16.x ) + nodeVar21.x ) ), 0.0, 0.0, 1.0 ).x;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\n\n\n\n\n// uniforms\n\nlayout( std140 ) uniform render {\n\tmat4 cameraProjectionMatrix;\n\tmat4 cameraViewMatrix;\n};\n\nlayout( std140 ) uniform object {\n\tmat3 nodeUniform1;\n\tfloat nodeUniform2;\n\tmat3 nodeUniform3;\n\tuint nodeUniform4;\n\tvec2 nodeUniform5;\n\tuint nodeUniform6;\n\tfloat nodeUniform7;\n\tmat4 nodeUniform10;\n};\n\n\n// varyings\nvec4 v_modelViewProjection;\nvec3 v_positionView;\nvec3 positionLocal;\nvec4 VERTEX_v_modelViewProjection;\nout vec2 nodeVarying4;\n\n\n// attributes\nlayout( location = 0 ) in vec2 uv;\nlayout( location = 1 ) in vec3 position;\n\n\n// vars\nmat4 modelViewMatrix;\nvec4 VERTEX_nodeVar10;\n\n// codes\n\n\nvoid main() {\n\n\t// transforms\n\t\n\n\t// flow\n\t// code\n\n\tnodeVarying4 = uv;\n\tmodelViewMatrix = ( cameraViewMatrix * nodeUniform10 );\n\tpositionLocal = position;\n\tv_positionView = ( modelViewMatrix * vec4( positionLocal, 1.0 ) ).xyz;\n\tVERTEX_nodeVar10 = ( cameraProjectionMatrix * vec4( v_positionView, 1.0 ) );\n\tVERTEX_v_modelViewProjection = VERTEX_nodeVar10;\n\n\t// result\n\tgl_Position = VERTEX_v_modelViewProjection;\n\n\tgl_PointSize = 1.0;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\nlayout( location = 0 ) out vec2 fragColor;\n\n\n\n// uniforms\n\nlayout( std140 ) uniform object {\n\tmat3 nodeUniform1;\n\tfloat nodeUniform2;\n\tmat3 nodeUniform3;\n\tuint nodeUniform4;\n\tvec2 nodeUniform5;\n\tuint nodeUniform6;\n\tfloat nodeUniform7;\n\tmat4 nodeUniform10;\n};\nuniform sampler2D nodeUniform0;\n\n// varyings\nin vec2 nodeVarying4;\n\n\n// vars\nvec2 nodeVar0;\nvec2 nodeVar1;\nbool nodeVar2;\nvec2 nodeVar3;\nvec4 nodeVar4;\nvec2 nodeVar5;\nvec2 nodeVar6;\nbool nodeVar7;\nvec2 nodeVar8;\nvec4 nodeVar9;\n\n// codes\n\n\nvoid main() {\n\n\t// flow\n\t// code\n\n\tnodeVar0 = ( nodeUniform3 * vec3( nodeVarying4, 1.0 ) ).xy;\n\tnodeVar2 = bool( nodeUniform4 );\n\n\tif ( nodeVar2 ) {\n\n\t\tnodeVar3 = nodeVar0;\n\t\tnodeVar1 = vec2( nodeVar3.x, 1.0 - nodeVar3.y );\n\n\t} else {\n\n\t\tnodeVar1 = nodeVar0;\n\n\t}\n\n\tnodeVar4 = texture( nodeUniform0, nodeVar1 );\n\tnodeVar5 = ( nodeUniform1 * vec3( clamp( ( nodeVarying4 - ( vec2( nodeUniform2 ) * ( ( nodeVar4.xy * vec2( clamp( ( 500.0 / max( length( nodeVar4.xy ), 500.0 ) ), 0.0, 1.0 ) ) ) * ( vec2( 1.0, 1.0 ) / nodeUniform5 ) ) ) ), vec2( 0.0 ), vec2( 1.0 ) ), 1.0 ) ).xy;\n\tnodeVar7 = bool( nodeUniform6 );\n\n\tif ( nodeVar7 ) {\n\n\t\tnodeVar8 = nodeVar5;\n\t\tnodeVar6 = vec2( nodeVar8.x, 1.0 - nodeVar8.y );\n\n\t} else {\n\n\t\tnodeVar6 = nodeVar5;\n\n\t}\n\n\tnodeVar9 = texture( nodeUniform0, nodeVar6 );\n\n\t// result\n\tfragColor = vec4( ( nodeVar9 * vec4( nodeUniform7 ) ).xy, 0.0, 1.0 ).xy;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\n\n\n\n\n// uniforms\n\nlayout( std140 ) uniform render {\n\tmat4 cameraProjectionMatrix;\n\tmat4 cameraViewMatrix;\n};\n\nlayout( std140 ) uniform object {\n\tmat3 nodeUniform1;\n\tuint nodeUniform2;\n\tmat3 nodeUniform4;\n\tvec2 nodeUniform5;\n\tfloat nodeUniform6;\n\tuint nodeUniform7;\n\tmat3 nodeUniform8;\n\tuint nodeUniform9;\n\tmat3 nodeUniform10;\n\tuint nodeUniform11;\n\tmat3 nodeUniform12;\n\tuint nodeUniform13;\n\tmat4 nodeUniform16;\n};\n\n\n// varyings\nvec4 v_modelViewProjection;\nvec3 v_positionView;\nvec3 positionLocal;\nvec4 VERTEX_v_modelViewProjection;\nout vec2 nodeVarying4;\n\n\n// attributes\nlayout( location = 0 ) in vec2 uv;\nlayout( location = 1 ) in vec3 position;\n\n\n// vars\nmat4 modelViewMatrix;\nvec4 VERTEX_nodeVar28;\n\n// codes\n\n\nvoid main() {\n\n\t// transforms\n\t\n\n\t// flow\n\t// code\n\n\tnodeVarying4 = uv;\n\tmodelViewMatrix = ( cameraViewMatrix * nodeUniform16 );\n\tpositionLocal = position;\n\tv_positionView = ( modelViewMatrix * vec4( positionLocal, 1.0 ) ).xyz;\n\tVERTEX_nodeVar28 = ( cameraProjectionMatrix * vec4( v_positionView, 1.0 ) );\n\tVERTEX_v_modelViewProjection = VERTEX_nodeVar28;\n\n\t// result\n\tgl_Position = VERTEX_v_modelViewProjection;\n\n\tgl_PointSize = 1.0;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\nlayout( location = 0 ) out vec2 fragColor;\n\n\n\n// uniforms\n\nlayout( std140 ) uniform object {\n\tmat3 nodeUniform1;\n\tuint nodeUniform2;\n\tmat3 nodeUniform4;\n\tvec2 nodeUniform5;\n\tfloat nodeUniform6;\n\tuint nodeUniform7;\n\tmat3 nodeUniform8;\n\tuint nodeUniform9;\n\tmat3 nodeUniform10;\n\tuint nodeUniform11;\n\tmat3 nodeUniform12;\n\tuint nodeUniform13;\n\tmat4 nodeUniform16;\n};\nuniform sampler2D nodeUniform0;\nuniform sampler2D nodeUniform3;\n\n// varyings\nin vec2 nodeVarying4;\n\n\n// vars\nvec2 nodeVar0;\nvec2 nodeVar1;\nbool nodeVar2;\nvec2 nodeVar3;\nvec4 nodeVar4;\nvec2 nodeVar5;\nvec2 nodeVar6;\nvec2 nodeVar7;\nvec2 nodeVar8;\nvec2 nodeVar9;\nbool nodeVar10;\nvec2 nodeVar11;\nvec4 nodeVar12;\nvec2 nodeVar13;\nvec2 nodeVar14;\nbool nodeVar15;\nvec2 nodeVar16;\nvec4 nodeVar17;\nvec2 nodeVar18;\nvec2 nodeVar19;\nbool nodeVar20;\nvec2 nodeVar21;\nvec4 nodeVar22;\nvec2 nodeVar23;\nvec2 nodeVar24;\nbool nodeVar25;\nvec2 nodeVar26;\nvec4 nodeVar27;\n\n// codes\n\n\nvoid main() {\n\n\t// flow\n\t// code\n\n\tnodeVar0 = ( nodeUniform1 * vec3( nodeVarying4, 1.0 ) ).xy;\n\tnodeVar2 = bool( nodeUniform2 );\n\n\tif ( nodeVar2 ) {\n\n\t\tnodeVar3 = nodeVar0;\n\t\tnodeVar1 = vec2( nodeVar3.x, 1.0 - nodeVar3.y );\n\n\t} else {\n\n\t\tnodeVar1 = nodeVar0;\n\n\t}\n\n\tnodeVar4 = texture( nodeUniform0, nodeVar1 );\n\tnodeVar5 = nodeVar4.xy;\n\tnodeVar6 = ( ( vec2( 1.0, 1.0 ) / nodeUniform5 ) * vec2( nodeUniform6 ) );\n\tnodeVar7 = ( vec2( 0.5, 0.5 ) / nodeUniform5 );\n\tnodeVar8 = ( nodeUniform4 * vec3( clamp( ( nodeVarying4 + vec2( nodeVar6.x, 0.0 ) ), nodeVar7, ( vec2( 1.0, 1.0 ) - nodeVar7 ) ), 1.0 ) ).xy;\n\tnodeVar10 = bool( nodeUniform7 );\n\n\tif ( nodeVar10 ) {\n\n\t\tnodeVar11 = nodeVar8;\n\t\tnodeVar9 = vec2( nodeVar11.x, 1.0 - nodeVar11.y );\n\n\t} else {\n\n\t\tnodeVar9 = nodeVar8;\n\n\t}\n\n\tnodeVar12 = texture( nodeUniform3, nodeVar9 );\n\tnodeVar13 = ( nodeUniform8 * vec3( clamp( ( nodeVarying4 - vec2( nodeVar6.x, 0.0 ) ), nodeVar7, ( vec2( 1.0, 1.0 ) - nodeVar7 ) ), 1.0 ) ).xy;\n\tnodeVar15 = bool( nodeUniform9 );\n\n\tif ( nodeVar15 ) {\n\n\t\tnodeVar16 = nodeVar13;\n\t\tnodeVar14 = vec2( nodeVar16.x, 1.0 - nodeVar16.y );\n\n\t} else {\n\n\t\tnodeVar14 = nodeVar13;\n\n\t}\n\n\tnodeVar17 = texture( nodeUniform3, nodeVar14 );\n\tnodeVar18 = ( nodeUniform10 * vec3( clamp( ( nodeVarying4 + vec2( 0.0, nodeVar6.y ) ), nodeVar7, ( vec2( 1.0, 1.0 ) - nodeVar7 ) ), 1.0 ) ).xy;\n\tnodeVar20 = bool( nodeUniform11 );\n\n\tif ( nodeVar20 ) {\n\n\t\tnodeVar21 = nodeVar18;\n\t\tnodeVar19 = vec2( nodeVar21.x, 1.0 - nodeVar21.y );\n\n\t} else {\n\n\t\tnodeVar19 = nodeVar18;\n\n\t}\n\n\tnodeVar22 = texture( nodeUniform3, nodeVar19 );\n\tnodeVar23 = ( nodeUniform12 * vec3( clamp( ( nodeVarying4 - vec2( 0.0, nodeVar6.y ) ), nodeVar7, ( vec2( 1.0, 1.0 ) - nodeVar7 ) ), 1.0 ) ).xy;\n\tnodeVar25 = bool( nodeUniform13 );\n\n\tif ( nodeVar25 ) {\n\n\t\tnodeVar26 = nodeVar23;\n\t\tnodeVar24 = vec2( nodeVar26.x, 1.0 - nodeVar26.y );\n\n\t} else {\n\n\t\tnodeVar24 = nodeVar23;\n\n\t}\n\n\tnodeVar27 = texture( nodeUniform3, nodeVar24 );\n\tnodeVar5 = ( nodeVar5 - ( vec2( ( nodeVar12.x - nodeVar17.x ), ( nodeVar22.x - nodeVar27.x ) ) * vec2( 0.5 ) ) );\n\n\t// result\n\tfragColor = vec4( nodeVar5, 0.0, 1.0 ).xy;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\n\n\n\n\n// uniforms\n\nlayout( std140 ) uniform render {\n\tmat4 cameraProjectionMatrix;\n\tmat4 cameraViewMatrix;\n\tvec3 nodeUniform11;\n\tvec3 nodeUniform18;\n\tvec3 nodeUniform23;\n\tvec3 nodeUniform26;\n\tvec3 nodeUniform9;\n\tvec3 nodeUniform10;\n\tvec3 nodeUniform16;\n\tvec3 nodeUniform17;\n\tvec3 nodeUniform21;\n\tvec3 nodeUniform22;\n\tmat4 cameraWorldMatrix;\n};\n\nlayout( std140 ) uniform object {\n\tvec3 nodeUniform0;\n\tfloat nodeUniform1;\n\tfloat nodeUniform2;\n\tfloat nodeUniform3;\n\tmat3 nodeUniform5;\n\tvec3 nodeUniform6;\n\tfloat nodeUniform7;\n\tmat4 nodeUniform12;\n\tuint nodeUniform14;\n\tuint nodeUniform15;\n\tuint nodeUniform19;\n\tuint nodeUniform20;\n\tuint nodeUniform24;\n\tuint nodeUniform25;\n\tfloat nodeUniform27;\n\tmat4 nodeUniform28;\n\tfloat nodeUniform30;\n\tfloat nodeUniform31;\n\tuint nodeUniform33;\n\tuint nodeUniform34;\n\tfloat nodeUniform35;\n\tuint nodeUniform36;\n\tuint nodeUniform37;\n\tuint nodeUniform38;\n\tuint nodeUniform39;\n};\n\n\n// varyings\nvec4 v_modelViewProjection;\nvec3 v_positionView;\nvec3 positionLocal;\nout vec3 v_normalViewGeometry;\nout vec3 v_positionViewDirection;\nvec4 VERTEX_v_modelViewProjection;\n\n\n// attributes\nlayout( location = 0 ) in vec3 normal;\nlayout( location = 1 ) in vec3 position;\n\n\n// vars\nvec3 normalLocal;\nmat4 modelViewMatrix;\nvec4 VERTEX_nodeVar232;\n\n// codes\n\n\nvoid main() {\n\n\t// transforms\n\t\n\n\t// flow\n\t// code\n\n\tnormalLocal = normal;\n\tv_normalViewGeometry = normalize( ( cameraViewMatrix * vec4( ( nodeUniform5 * normalLocal ), 0.0 ) ).xyz );\n\tmodelViewMatrix = ( cameraViewMatrix * nodeUniform12 );\n\tpositionLocal = position;\n\tv_positionView = ( modelViewMatrix * vec4( positionLocal, 1.0 ) ).xyz;\n\tv_positionViewDirection = ( - v_positionView );\n\tVERTEX_nodeVar232 = ( cameraProjectionMatrix * vec4( v_positionView, 1.0 ) );\n\tVERTEX_v_modelViewProjection = VERTEX_nodeVar232;\n\n\t// result\n\tgl_Position = VERTEX_v_modelViewProjection;\n\n\tgl_PointSize = 1.0;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\nlayout( location = 0 ) out vec4 fragColor;\n\n\n\n// uniforms\n\nlayout( std140 ) uniform object {\n\tvec3 nodeUniform0;\n\tfloat nodeUniform1;\n\tfloat nodeUniform2;\n\tfloat nodeUniform3;\n\tmat3 nodeUniform5;\n\tvec3 nodeUniform6;\n\tfloat nodeUniform7;\n\tmat4 nodeUniform12;\n\tuint nodeUniform14;\n\tuint nodeUniform15;\n\tuint nodeUniform19;\n\tuint nodeUniform20;\n\tuint nodeUniform24;\n\tuint nodeUniform25;\n\tfloat nodeUniform27;\n\tmat4 nodeUniform28;\n\tfloat nodeUniform30;\n\tfloat nodeUniform31;\n\tuint nodeUniform33;\n\tuint nodeUniform34;\n\tfloat nodeUniform35;\n\tuint nodeUniform36;\n\tuint nodeUniform37;\n\tuint nodeUniform38;\n\tuint nodeUniform39;\n};\n\nlayout( std140 ) uniform render {\n\tmat4 cameraProjectionMatrix;\n\tmat4 cameraViewMatrix;\n\tvec3 nodeUniform11;\n\tvec3 nodeUniform18;\n\tvec3 nodeUniform23;\n\tvec3 nodeUniform26;\n\tvec3 nodeUniform9;\n\tvec3 nodeUniform10;\n\tvec3 nodeUniform16;\n\tvec3 nodeUniform17;\n\tvec3 nodeUniform21;\n\tvec3 nodeUniform22;\n\tmat4 cameraWorldMatrix;\n};\nuniform sampler2D nodeUniform13;\nuniform sampler2D nodeUniform32;\n\n// varyings\nin vec3 v_normalViewGeometry;\nin vec3 v_positionViewDirection;\n\n\n// vars\nvec4 DiffuseColor;\nfloat Metalness;\nfloat Roughness;\nvec3 normalViewGeometry;\nvec3 nodeVar0;\nvec3 SpecularColor;\nvec3 SpecularColorBlended;\nfloat SpecularF90;\nvec3 DiffuseContribution;\nvec3 EmissiveColor;\nvec4 Output;\nvec3 NORMAL_normalView;\nvec3 normalView;\nvec3 nodeVar1;\nvec4 nodeVar2;\nvec4 nodeVar3;\nvec3 nodeVar4;\nvec3 nodeVar5;\nfloat nodeVar6;\nvec3 nodeVar7;\nvec3 nodeVar8;\nvec3 directDiffuse;\nvec3 nodeVar9;\nvec3 nodeVar10;\nvec3 nodeVar11;\nvec3 directSpecular;\nvec3 positionViewDirection;\nvec3 nodeVar12;\nfloat nodeVar13;\nfloat nodeVar14;\nfloat nodeVar15;\nvec2 nodeVar16;\nvec2 nodeVar17;\nbool nodeVar18;\nvec2 nodeVar19;\nvec4 nodeVar20;\nvec2 nodeVar21;\nvec2 nodeVar22;\nbool nodeVar23;\nvec2 nodeVar24;\nvec4 nodeVar25;\nvec3 nodeVar26;\nfloat nodeVar27;\nfloat nodeVar28;\nvec3 nodeVar29;\nvec3 nodeVar30;\nvec3 nodeVar31;\nvec3 nodeVar32;\nvec4 nodeVar33;\nvec4 nodeVar34;\nvec3 nodeVar35;\nvec3 nodeVar36;\nfloat nodeVar37;\nvec3 nodeVar38;\nvec3 nodeVar39;\nvec3 nodeVar40;\nvec3 nodeVar41;\nvec3 nodeVar42;\nvec3 nodeVar43;\nfloat nodeVar44;\nfloat nodeVar45;\nfloat nodeVar46;\nvec2 nodeVar47;\nvec2 nodeVar48;\nbool nodeVar49;\nvec2 nodeVar50;\nvec4 nodeVar51;\nvec2 nodeVar52;\nvec2 nodeVar53;\nbool nodeVar54;\nvec2 nodeVar55;\nvec4 nodeVar56;\nvec3 nodeVar57;\nfloat nodeVar58;\nfloat nodeVar59;\nvec3 nodeVar60;\nvec3 nodeVar61;\nvec3 nodeVar62;\nvec3 nodeVar63;\nvec4 nodeVar64;\nvec4 nodeVar65;\nvec3 nodeVar66;\nvec3 nodeVar67;\nfloat nodeVar68;\nvec3 nodeVar69;\nvec3 nodeVar70;\nvec3 nodeVar71;\nvec3 nodeVar72;\nvec3 nodeVar73;\nvec3 nodeVar74;\nfloat nodeVar75;\nfloat nodeVar76;\nfloat nodeVar77;\nvec2 nodeVar78;\nvec2 nodeVar79;\nbool nodeVar80;\nvec2 nodeVar81;\nvec4 nodeVar82;\nvec2 nodeVar83;\nvec2 nodeVar84;\nbool nodeVar85;\nvec2 nodeVar86;\nvec4 nodeVar87;\nvec3 nodeVar88;\nfloat nodeVar89;\nfloat nodeVar90;\nvec3 nodeVar91;\nvec3 nodeVar92;\nvec3 nodeVar93;\nvec3 irradiance;\nvec3 nodeVar94;\nvec3 radiance;\nfloat nodeVar95;\nfloat nodeVar96;\nfloat nodeVar97;\nvec3 nodeVar98;\nfloat nodeVar99;\nfloat nodeVar100;\nfloat nodeVar101;\nvec2 nodeVar102;\nvec2 nodeVar103;\nvec2 nodeVar104;\nbool nodeVar105;\nvec2 nodeVar106;\nvec4 nodeVar107;\nvec3 nodeVar108;\nfloat nodeVar109;\nfloat nodeVar110;\nfloat nodeVar111;\nfloat nodeVar112;\nfloat nodeVar113;\nvec2 nodeVar114;\nvec2 nodeVar115;\nvec2 nodeVar116;\nbool nodeVar117;\nvec2 nodeVar118;\nvec4 nodeVar119;\nvec3 nodeVar120;\nvec3 nodeVar121;\nvec3 iblIrradiance;\nfloat nodeVar122;\nfloat nodeVar123;\nfloat nodeVar124;\nvec3 normalWorld;\nfloat nodeVar125;\nfloat nodeVar126;\nfloat nodeVar127;\nvec2 nodeVar128;\nvec2 nodeVar129;\nvec2 nodeVar130;\nbool nodeVar131;\nvec2 nodeVar132;\nvec4 nodeVar133;\nvec3 nodeVar134;\nfloat nodeVar135;\nfloat nodeVar136;\nfloat nodeVar137;\nfloat nodeVar138;\nfloat nodeVar139;\nvec2 nodeVar140;\nvec2 nodeVar141;\nvec2 nodeVar142;\nbool nodeVar143;\nvec2 nodeVar144;\nvec4 nodeVar145;\nvec3 nodeVar146;\nvec3 nodeVar147;\nvec3 nodeVar148;\nvec3 nodeVar149;\nvec3 nodeVar150;\nvec3 indirectDiffuse;\nvec3 nodeVar151;\nvec3 singleScatteringDielectric;\nvec3 multiScatteringDielectric;\nvec3 singleScatteringMetallic;\nvec3 multiScatteringMetallic;\nfloat nodeVar152;\nvec2 nodeVar153;\nvec2 nodeVar154;\nbool nodeVar155;\nvec2 nodeVar156;\nvec4 nodeVar157;\nvec3 nodeVar158;\nfloat nodeVar159;\nvec3 nodeVar160;\nvec3 nodeVar161;\nvec3 nodeVar162;\nvec3 nodeVar163;\nvec3 nodeVar164;\nvec3 nodeVar165;\nvec3 nodeVar166;\nfloat nodeVar167;\nfloat nodeVar168;\nfloat nodeVar169;\nvec3 nodeVar170;\nvec3 nodeVar171;\nvec3 nodeVar172;\nvec3 nodeVar173;\nvec3 nodeVar174;\nvec3 nodeVar175;\nfloat nodeVar176;\nvec2 nodeVar177;\nvec2 nodeVar178;\nbool nodeVar179;\nvec2 nodeVar180;\nvec4 nodeVar181;\nvec3 nodeVar182;\nfloat nodeVar183;\nvec3 nodeVar184;\nvec3 nodeVar185;\nvec3 nodeVar186;\nvec3 nodeVar187;\nvec3 nodeVar188;\nvec3 nodeVar189;\nvec3 nodeVar190;\nfloat nodeVar191;\nfloat nodeVar192;\nfloat nodeVar193;\nvec3 nodeVar194;\nvec3 nodeVar195;\nvec3 nodeVar196;\nvec3 nodeVar197;\nvec3 nodeVar198;\nvec3 nodeVar199;\nvec3 nodeVar200;\nvec3 nodeVar201;\nvec3 nodeVar202;\nvec3 nodeVar203;\nvec3 nodeVar204;\nvec3 nodeVar205;\nvec3 nodeVar206;\nvec3 nodeVar207;\nvec3 nodeVar208;\nvec3 nodeVar209;\nvec3 nodeVar210;\nvec3 nodeVar211;\nvec3 nodeVar212;\nvec3 indirectSpecular;\nvec3 nodeVar213;\nvec3 nodeVar214;\nfloat ambientOcclusion;\nvec3 nodeVar215;\nfloat nodeVar216;\nfloat nodeVar217;\nfloat nodeVar218;\nfloat nodeVar219;\nfloat nodeVar220;\nfloat nodeVar221;\nfloat nodeVar222;\nfloat nodeVar223;\nfloat nodeVar224;\nfloat nodeVar225;\nfloat nodeVar226;\nvec3 nodeVar227;\nvec3 totalDiffuse;\nvec3 nodeVar228;\nvec3 totalSpecular;\nvec3 nodeVar229;\nvec3 outgoingLight;\nvec3 nodeVar230;\nvec4 nodeVar231;\n\n// codes\nfloat V_GGX_SmithCorrelated ( float alpha, float dotNL, float dotNV ) {\n\n\tfloat nodeVar0;\n\n\tnodeVar0 = ( alpha * alpha );\n\n\treturn ( 0.5 / max( ( ( dotNL * sqrt( ( nodeVar0 + ( ( 1.0 - nodeVar0 ) * ( dotNV * dotNV ) ) ) ) ) + ( dotNV * sqrt( ( nodeVar0 + ( ( 1.0 - nodeVar0 ) * ( dotNL * dotNL ) ) ) ) ) ), 0.000001 ) );\n\n}\n\nfloat D_GGX ( float alpha, float dotNH ) {\n\n\tfloat nodeVar0;\n\tfloat nodeVar1;\n\n\tnodeVar0 = ( alpha * alpha );\n\tnodeVar1 = ( 1.0 - ( ( dotNH * dotNH ) * ( 1.0 - nodeVar0 ) ) );\n\n\treturn ( ( nodeVar0 / ( nodeVar1 * nodeVar1 ) ) * 0.3183098861837907 );\n\n}\n\nfloat roughnessToMip ( float roughness ) {\n\n\tfloat nodeVar0;\n\n\tnodeVar0 = 0.0;\n\n\tif ( ( roughness >= 0.8 ) ) {\n\n\t\tnodeVar0 = ( ( ( ( 1.0 - roughness ) * ( -1.0 - -2.0 ) ) / ( 1.0 - 0.8 ) ) + -2.0 );\n\t\t\n\n\t} else {\n\n\n\t\tif ( ( roughness >= 0.4 ) ) {\n\n\t\t\tnodeVar0 = ( ( ( ( 0.8 - roughness ) * ( 2.0 - -1.0 ) ) / ( 0.8 - 0.4 ) ) + -1.0 );\n\t\t\t\n\n\t\t} else {\n\n\n\t\t\tif ( ( roughness >= 0.305 ) ) {\n\n\t\t\t\tnodeVar0 = ( ( ( ( 0.4 - roughness ) * ( 3.0 - 2.0 ) ) / ( 0.4 - 0.305 ) ) + 2.0 );\n\t\t\t\t\n\n\t\t\t} else {\n\n\n\t\t\t\tif ( ( roughness >= 0.21 ) ) {\n\n\t\t\t\t\tnodeVar0 = ( ( ( ( 0.305 - roughness ) * ( 4.0 - 3.0 ) ) / ( 0.305 - 0.21 ) ) + 3.0 );\n\t\t\t\t\t\n\n\t\t\t\t} else {\n\n\t\t\t\t\tnodeVar0 = ( -2.0 * log2( ( 1.16 * roughness ) ) );\n\t\t\t\t\t\n\n\t\t\t\t}\n\n\t\t\t\t\n\n\t\t\t}\n\n\t\t\t\n\n\t\t}\n\n\t\t\n\n\t}\n\n\n\treturn nodeVar0;\n\n}\n\nfloat getFace ( vec3 direction ) {\n\n\tvec3 nodeVar0;\n\tfloat nodeVar1;\n\tfloat nodeVar2;\n\tfloat nodeVar3;\n\tfloat nodeVar4;\n\tfloat nodeVar5;\n\n\tnodeVar0 = abs( direction );\n\tnodeVar1 = -1.0;\n\n\tif ( ( nodeVar0.x > nodeVar0.z ) ) {\n\n\n\t\tif ( ( nodeVar0.x > nodeVar0.y ) ) {\n\n\n\t\t\tif ( ( direction.x > 0.0 ) ) {\n\n\t\t\t\tnodeVar2 = 0.0;\n\n\t\t\t} else {\n\n\t\t\t\tnodeVar2 = 3.0;\n\n\t\t\t}\n\n\t\t\tnodeVar1 = nodeVar2;\n\t\t\t\n\n\t\t} else {\n\n\n\t\t\tif ( ( direction.y > 0.0 ) ) {\n\n\t\t\t\tnodeVar3 = 1.0;\n\n\t\t\t} else {\n\n\t\t\t\tnodeVar3 = 4.0;\n\n\t\t\t}\n\n\t\t\tnodeVar1 = nodeVar3;\n\t\t\t\n\n\t\t}\n\n\t\t\n\n\t} else {\n\n\n\t\tif ( ( nodeVar0.z > nodeVar0.y ) ) {\n\n\n\t\t\tif ( ( direction.z > 0.0 ) ) {\n\n\t\t\t\tnodeVar4 = 2.0;\n\n\t\t\t} else {\n\n\t\t\t\tnodeVar4 = 5.0;\n\n\t\t\t}\n\n\t\t\tnodeVar1 = nodeVar4;\n\t\t\t\n\n\t\t} else {\n\n\n\t\t\tif ( ( direction.y > 0.0 ) ) {\n\n\t\t\t\tnodeVar5 = 1.0;\n\n\t\t\t} else {\n\n\t\t\t\tnodeVar5 = 4.0;\n\n\t\t\t}\n\n\t\t\tnodeVar1 = nodeVar5;\n\t\t\t\n\n\t\t}\n\n\t\t\n\n\t}\n\n\n\treturn nodeVar1;\n\n}\n\nvec2 getUV ( vec3 direction, float face ) {\n\n\tvec2 nodeVar0;\n\n\tnodeVar0 = vec2( 0.0, 0.0 );\n\n\tif ( ( face == 0.0 ) ) {\n\n\t\tnodeVar0 = ( vec2( direction.z, direction.y ) / vec2( abs( direction.x ) ) );\n\t\t\n\n\t} else {\n\n\n\t\tif ( ( face == 1.0 ) ) {\n\n\t\t\tnodeVar0 = ( vec2( ( - direction.x ), ( - direction.z ) ) / vec2( abs( direction.y ) ) );\n\t\t\t\n\n\t\t} else {\n\n\n\t\t\tif ( ( face == 2.0 ) ) {\n\n\t\t\t\tnodeVar0 = ( vec2( ( - direction.x ), direction.y ) / vec2( abs( direction.z ) ) );\n\t\t\t\t\n\n\t\t\t} else {\n\n\n\t\t\t\tif ( ( face == 3.0 ) ) {\n\n\t\t\t\t\tnodeVar0 = ( vec2( ( - direction.z ), direction.y ) / vec2( abs( direction.x ) ) );\n\t\t\t\t\t\n\n\t\t\t\t} else {\n\n\n\t\t\t\t\tif ( ( face == 4.0 ) ) {\n\n\t\t\t\t\t\tnodeVar0 = ( vec2( ( - direction.x ), direction.z ) / vec2( abs( direction.y ) ) );\n\t\t\t\t\t\t\n\n\t\t\t\t\t} else {\n\n\t\t\t\t\t\tnodeVar0 = ( vec2( direction.x, direction.y ) / vec2( abs( direction.z ) ) );\n\t\t\t\t\t\t\n\n\t\t\t\t\t}\n\n\t\t\t\t\t\n\n\t\t\t\t}\n\n\t\t\t\t\n\n\t\t\t}\n\n\t\t\t\n\n\t\t}\n\n\t\t\n\n\t}\n\n\n\treturn ( vec2( 0.5 ) * ( nodeVar0 + vec2( 1.0 ) ) );\n\n}\n\n\n\nvoid main() {\n\n\t// flow\n\t// code\n\n\tDiffuseColor = vec4( nodeUniform0, 1.0 );\n\tDiffuseColor.w = ( DiffuseColor.w * nodeUniform1 );\n\tDiffuseColor.w = 1.0;\n\tMetalness = nodeUniform2;\n\tnormalViewGeometry = normalize( v_normalViewGeometry );\n\tnodeVar0 = max( abs( dFdx( normalViewGeometry ) ), abs( dFdy( normalViewGeometry ) ) );\n\tRoughness = min( ( max( nodeUniform3, 0.0525 ) + max( max( nodeVar0.x, nodeVar0.y ), nodeVar0.z ) ), 1.0 );\n\tSpecularColor = vec3( 0.04, 0.04, 0.04 );\n\tSpecularColorBlended = mix( vec3( 0.04, 0.04, 0.04 ), DiffuseColor.xyz, Metalness );\n\tSpecularF90 = 1.0;\n\tDiffuseContribution = ( DiffuseColor.xyz * vec3( ( 1.0 - nodeUniform2 ) ) );\n\tEmissiveColor = ( nodeUniform6 * vec3( nodeUniform7 ) );\n\tNORMAL_normalView = normalViewGeometry;\n\tnormalView = NORMAL_normalView;\n\tnodeVar1 = ( nodeUniform9 - nodeUniform10 );\n\tnodeVar2 = vec4( nodeVar1, 0.0 );\n\tnodeVar3 = ( cameraViewMatrix * nodeVar2 );\n\tnodeVar4 = normalize( nodeVar3.xyz );\n\tnodeVar5 = nodeVar4;\n\tnodeVar6 = dot( normalView, nodeVar5 );\n\tnodeVar7 = ( vec3( clamp( nodeVar6, 0.0, 1.0 ) ) * nodeUniform11 );\n\tnodeVar8 = nodeVar7;\n\tdirectDiffuse = vec3( 0.0, 0.0, 0.0 );\n\tnodeVar9 = ( DiffuseContribution * vec3( 0.3183098861837907 ) );\n\tnodeVar10 = ( nodeVar8 * nodeVar9 );\n\tnodeVar11 = ( directDiffuse + nodeVar10 );\n\tdirectDiffuse = nodeVar11;\n\tdirectSpecular = vec3( 0.0, 0.0, 0.0 );\n\tpositionViewDirection = normalize( v_positionViewDirection );\n\tnodeVar12 = normalize( ( nodeVar5 + positionViewDirection ) );\n\tnodeVar13 = clamp( dot( positionViewDirection, nodeVar12 ), 0.0, 1.0 );\n\tnodeVar14 = exp2( ( ( ( nodeVar13 * -5.55473 ) - 6.98316 ) * nodeVar13 ) );\n\tnodeVar15 = ( Roughness * Roughness );\n\tnodeVar16 = vec2( Roughness, clamp( dot( normalView, positionViewDirection ), 0.0, 1.0 ) );\n\tnodeVar18 = bool( nodeUniform14 );\n\n\tif ( nodeVar18 ) {\n\n\t\tnodeVar19 = nodeVar16;\n\t\tnodeVar17 = vec2( nodeVar19.x, 1.0 - nodeVar19.y );\n\n\t} else {\n\n\t\tnodeVar17 = nodeVar16;\n\n\t}\n\n\tnodeVar20 = texture( nodeUniform13, nodeVar17 );\n\tnodeVar21 = vec2( Roughness, clamp( dot( normalView, nodeVar5 ), 0.0, 1.0 ) );\n\tnodeVar23 = bool( nodeUniform15 );\n\n\tif ( nodeVar23 ) {\n\n\t\tnodeVar24 = nodeVar21;\n\t\tnodeVar22 = vec2( nodeVar24.x, 1.0 - nodeVar24.y );\n\n\t} else {\n\n\t\tnodeVar22 = nodeVar21;\n\n\t}\n\n\tnodeVar25 = texture( nodeUniform13, nodeVar22 );\n\tnodeVar26 = ( SpecularColorBlended + ( ( vec3( 1.0 ) - SpecularColorBlended ) * vec3( 0.047619 ) ) );\n\tnodeVar27 = ( 1.0 - ( nodeVar20.xy.x + nodeVar20.xy.y ) );\n\tnodeVar28 = ( 1.0 - ( nodeVar25.xy.x + nodeVar25.xy.y ) );\n\tnodeVar29 = ( ( ( ( ( SpecularColorBlended * vec3( ( 1.0 - nodeVar14 ) ) ) + vec3( ( 1.0 * nodeVar14 ) ) ) * vec3( V_GGX_SmithCorrelated( nodeVar15, clamp( dot( normalView, nodeVar5 ), 0.0, 1.0 ), clamp( dot( normalView, positionViewDirection ), 0.0, 1.0 ) ) ) ) * vec3( D_GGX( nodeVar15, clamp( dot( normalView, nodeVar12 ), 0.0, 1.0 ) ) ) ) + ( ( ( ( ( ( SpecularColorBlended * vec3( nodeVar20.xy.x ) ) + vec3( ( 1.0 * nodeVar20.xy.y ) ) ) * ( ( SpecularColorBlended * vec3( nodeVar25.xy.x ) ) + vec3( ( 1.0 * nodeVar25.xy.y ) ) ) ) * nodeVar26 ) / ( ( vec3( 1.0 ) - ( ( vec3( ( nodeVar27 * nodeVar28 ) ) * nodeVar26 ) * nodeVar26 ) ) + vec3( 0.000001 ) ) ) * vec3( ( nodeVar27 * nodeVar28 ) ) ) );\n\tnodeVar30 = ( nodeVar8 * nodeVar29 );\n\tnodeVar31 = ( directSpecular + nodeVar30 );\n\tdirectSpecular = nodeVar31;\n\tnodeVar32 = ( nodeUniform16 - nodeUniform17 );\n\tnodeVar33 = vec4( nodeVar32, 0.0 );\n\tnodeVar34 = ( cameraViewMatrix * nodeVar33 );\n\tnodeVar35 = normalize( nodeVar34.xyz );\n\tnodeVar36 = nodeVar35;\n\tnodeVar37 = dot( normalView, nodeVar36 );\n\tnodeVar38 = ( vec3( clamp( nodeVar37, 0.0, 1.0 ) ) * nodeUniform18 );\n\tnodeVar39 = nodeVar38;\n\tnodeVar40 = ( DiffuseContribution * vec3( 0.3183098861837907 ) );\n\tnodeVar41 = ( nodeVar39 * nodeVar40 );\n\tnodeVar42 = ( directDiffuse + nodeVar41 );\n\tdirectDiffuse = nodeVar42;\n\tnodeVar43 = normalize( ( nodeVar36 + positionViewDirection ) );\n\tnodeVar44 = clamp( dot( positionViewDirection, nodeVar43 ), 0.0, 1.0 );\n\tnodeVar45 = exp2( ( ( ( nodeVar44 * -5.55473 ) - 6.98316 ) * nodeVar44 ) );\n\tnodeVar46 = ( Roughness * Roughness );\n\tnodeVar47 = vec2( Roughness, clamp( dot( normalView, positionViewDirection ), 0.0, 1.0 ) );\n\tnodeVar49 = bool( nodeUniform19 );\n\n\tif ( nodeVar49 ) {\n\n\t\tnodeVar50 = nodeVar47;\n\t\tnodeVar48 = vec2( nodeVar50.x, 1.0 - nodeVar50.y );\n\n\t} else {\n\n\t\tnodeVar48 = nodeVar47;\n\n\t}\n\n\tnodeVar51 = texture( nodeUniform13, nodeVar48 );\n\tnodeVar52 = vec2( Roughness, clamp( dot( normalView, nodeVar36 ), 0.0, 1.0 ) );\n\tnodeVar54 = bool( nodeUniform20 );\n\n\tif ( nodeVar54 ) {\n\n\t\tnodeVar55 = nodeVar52;\n\t\tnodeVar53 = vec2( nodeVar55.x, 1.0 - nodeVar55.y );\n\n\t} else {\n\n\t\tnodeVar53 = nodeVar52;\n\n\t}\n\n\tnodeVar56 = texture( nodeUniform13, nodeVar53 );\n\tnodeVar57 = ( SpecularColorBlended + ( ( vec3( 1.0 ) - SpecularColorBlended ) * vec3( 0.047619 ) ) );\n\tnodeVar58 = ( 1.0 - ( nodeVar51.xy.x + nodeVar51.xy.y ) );\n\tnodeVar59 = ( 1.0 - ( nodeVar56.xy.x + nodeVar56.xy.y ) );\n\tnodeVar60 = ( ( ( ( ( SpecularColorBlended * vec3( ( 1.0 - nodeVar45 ) ) ) + vec3( ( 1.0 * nodeVar45 ) ) ) * vec3( V_GGX_SmithCorrelated( nodeVar46, clamp( dot( normalView, nodeVar36 ), 0.0, 1.0 ), clamp( dot( normalView, positionViewDirection ), 0.0, 1.0 ) ) ) ) * vec3( D_GGX( nodeVar46, clamp( dot( normalView, nodeVar43 ), 0.0, 1.0 ) ) ) ) + ( ( ( ( ( ( SpecularColorBlended * vec3( nodeVar51.xy.x ) ) + vec3( ( 1.0 * nodeVar51.xy.y ) ) ) * ( ( SpecularColorBlended * vec3( nodeVar56.xy.x ) ) + vec3( ( 1.0 * nodeVar56.xy.y ) ) ) ) * nodeVar57 ) / ( ( vec3( 1.0 ) - ( ( vec3( ( nodeVar58 * nodeVar59 ) ) * nodeVar57 ) * nodeVar57 ) ) + vec3( 0.000001 ) ) ) * vec3( ( nodeVar58 * nodeVar59 ) ) ) );\n\tnodeVar61 = ( nodeVar39 * nodeVar60 );\n\tnodeVar62 = ( directSpecular + nodeVar61 );\n\tdirectSpecular = nodeVar62;\n\tnodeVar63 = ( nodeUniform21 - nodeUniform22 );\n\tnodeVar64 = vec4( nodeVar63, 0.0 );\n\tnodeVar65 = ( cameraViewMatrix * nodeVar64 );\n\tnodeVar66 = normalize( nodeVar65.xyz );\n\tnodeVar67 = nodeVar66;\n\tnodeVar68 = dot( normalView, nodeVar67 );\n\tnodeVar69 = ( vec3( clamp( nodeVar68, 0.0, 1.0 ) ) * nodeUniform23 );\n\tnodeVar70 = nodeVar69;\n\tnodeVar71 = ( DiffuseContribution * vec3( 0.3183098861837907 ) );\n\tnodeVar72 = ( nodeVar70 * nodeVar71 );\n\tnodeVar73 = ( directDiffuse + nodeVar72 );\n\tdirectDiffuse = nodeVar73;\n\tnodeVar74 = normalize( ( nodeVar67 + positionViewDirection ) );\n\tnodeVar75 = clamp( dot( positionViewDirection, nodeVar74 ), 0.0, 1.0 );\n\tnodeVar76 = exp2( ( ( ( nodeVar75 * -5.55473 ) - 6.98316 ) * nodeVar75 ) );\n\tnodeVar77 = ( Roughness * Roughness );\n\tnodeVar78 = vec2( Roughness, clamp( dot( normalView, positionViewDirection ), 0.0, 1.0 ) );\n\tnodeVar80 = bool( nodeUniform24 );\n\n\tif ( nodeVar80 ) {\n\n\t\tnodeVar81 = nodeVar78;\n\t\tnodeVar79 = vec2( nodeVar81.x, 1.0 - nodeVar81.y );\n\n\t} else {\n\n\t\tnodeVar79 = nodeVar78;\n\n\t}\n\n\tnodeVar82 = texture( nodeUniform13, nodeVar79 );\n\tnodeVar83 = vec2( Roughness, clamp( dot( normalView, nodeVar67 ), 0.0, 1.0 ) );\n\tnodeVar85 = bool( nodeUniform25 );\n\n\tif ( nodeVar85 ) {\n\n\t\tnodeVar86 = nodeVar83;\n\t\tnodeVar84 = vec2( nodeVar86.x, 1.0 - nodeVar86.y );\n\n\t} else {\n\n\t\tnodeVar84 = nodeVar83;\n\n\t}\n\n\tnodeVar87 = texture( nodeUniform13, nodeVar84 );\n\tnodeVar88 = ( SpecularColorBlended + ( ( vec3( 1.0 ) - SpecularColorBlended ) * vec3( 0.047619 ) ) );\n\tnodeVar89 = ( 1.0 - ( nodeVar82.xy.x + nodeVar82.xy.y ) );\n\tnodeVar90 = ( 1.0 - ( nodeVar87.xy.x + nodeVar87.xy.y ) );\n\tnodeVar91 = ( ( ( ( ( SpecularColorBlended * vec3( ( 1.0 - nodeVar76 ) ) ) + vec3( ( 1.0 * nodeVar76 ) ) ) * vec3( V_GGX_SmithCorrelated( nodeVar77, clamp( dot( normalView, nodeVar67 ), 0.0, 1.0 ), clamp( dot( normalView, positionViewDirection ), 0.0, 1.0 ) ) ) ) * vec3( D_GGX( nodeVar77, clamp( dot( normalView, nodeVar74 ), 0.0, 1.0 ) ) ) ) + ( ( ( ( ( ( SpecularColorBlended * vec3( nodeVar82.xy.x ) ) + vec3( ( 1.0 * nodeVar82.xy.y ) ) ) * ( ( SpecularColorBlended * vec3( nodeVar87.xy.x ) ) + vec3( ( 1.0 * nodeVar87.xy.y ) ) ) ) * nodeVar88 ) / ( ( vec3( 1.0 ) - ( ( vec3( ( nodeVar89 * nodeVar90 ) ) * nodeVar88 ) * nodeVar88 ) ) + vec3( 0.000001 ) ) ) * vec3( ( nodeVar89 * nodeVar90 ) ) ) );\n\tnodeVar92 = ( nodeVar70 * nodeVar91 );\n\tnodeVar93 = ( directSpecular + nodeVar92 );\n\tdirectSpecular = nodeVar93;\n\tirradiance = vec3( 0.0, 0.0, 0.0 );\n\tnodeVar94 = ( irradiance + nodeUniform26 );\n\tirradiance = nodeVar94;\n\tradiance = vec3( 0.0, 0.0, 0.0 );\n\tnodeVar95 = clamp( roughnessToMip( Roughness ), -2.0, nodeUniform27 );\n\tnodeVar96 = floor( nodeVar95 );\n\tnodeVar97 = nodeVar96;\n\tnodeVar98 = normalize( ( cameraWorldMatrix * vec4( normalize( mix( reflect( ( - positionViewDirection ), normalView ), normalView, ( ( ( Roughness * Roughness ) * Roughness ) * Roughness ) ) ), 0.0 ) ).xyz );\n\tnodeVar99 = getFace( ( nodeUniform28 * vec4( vec3( nodeVar98.x, ( - nodeVar98.y ), nodeVar98.z ), 1.0 ) ).xyz );\n\tnodeVar100 = max( ( 4.0 - nodeVar97 ), 0.0 );\n\tnodeVar97 = max( nodeVar97, 4.0 );\n\tnodeVar101 = exp2( nodeVar97 );\n\tnodeVar102 = ( ( getUV( ( nodeUniform28 * vec4( vec3( nodeVar98.x, ( - nodeVar98.y ), nodeVar98.z ), 1.0 ) ).xyz, nodeVar99 ) * vec2( ( nodeVar101 - 2.0 ) ) ) + vec2( 1.0 ) );\n\n\tif ( ( nodeVar99 > 2.0 ) ) {\n\n\t\tnodeVar102.y = ( nodeVar102.y + nodeVar101 );\n\t\tnodeVar99 = ( nodeVar99 - 3.0 );\n\t\t\n\n\t}\n\n\tnodeVar102.x = ( nodeVar102.x + ( nodeVar99 * nodeVar101 ) );\n\tnodeVar102.x = ( nodeVar102.x + ( nodeVar100 * ( 3.0 * 16.0 ) ) );\n\tnodeVar102.y = ( nodeVar102.y + ( 4.0 * ( exp2( nodeUniform27 ) - nodeVar101 ) ) );\n\tnodeVar102.x = ( nodeVar102.x * nodeUniform30 );\n\tnodeVar102.y = ( nodeVar102.y * nodeUniform31 );\n\tnodeVar103 = nodeVar102;\n\tnodeVar105 = bool( nodeUniform33 );\n\n\tif ( nodeVar105 ) {\n\n\t\tnodeVar106 = nodeVar103;\n\t\tnodeVar104 = vec2( nodeVar106.x, 1.0 - nodeVar106.y );\n\n\t} else {\n\n\t\tnodeVar104 = nodeVar103;\n\n\t}\n\n\tnodeVar107 = textureGrad( nodeUniform32, nodeVar104, vec2( 0.0, 0.0 ), vec2( 0.0, 0.0 ) );\n\tnodeVar108 = nodeVar107.xyz;\n\tnodeVar109 = fract( nodeVar95 );\n\n\tif ( ( nodeVar109 != 0.0 ) ) {\n\n\t\tnodeVar110 = ( nodeVar96 + 1.0 );\n\t\tnodeVar111 = getFace( ( nodeUniform28 * vec4( vec3( nodeVar98.x, ( - nodeVar98.y ), nodeVar98.z ), 1.0 ) ).xyz );\n\t\tnodeVar112 = max( ( 4.0 - nodeVar110 ), 0.0 );\n\t\tnodeVar110 = max( nodeVar110, 4.0 );\n\t\tnodeVar113 = exp2( nodeVar110 );\n\t\tnodeVar114 = ( ( getUV( ( nodeUniform28 * vec4( vec3( nodeVar98.x, ( - nodeVar98.y ), nodeVar98.z ), 1.0 ) ).xyz, nodeVar111 ) * vec2( ( nodeVar113 - 2.0 ) ) ) + vec2( 1.0 ) );\n\n\t\tif ( ( nodeVar111 > 2.0 ) ) {\n\n\t\t\tnodeVar114.y = ( nodeVar114.y + nodeVar113 );\n\t\t\tnodeVar111 = ( nodeVar111 - 3.0 );\n\t\t\t\n\n\t\t}\n\n\t\tnodeVar114.x = ( nodeVar114.x + ( nodeVar111 * nodeVar113 ) );\n\t\tnodeVar114.x = ( nodeVar114.x + ( nodeVar112 * ( 3.0 * 16.0 ) ) );\n\t\tnodeVar114.y = ( nodeVar114.y + ( 4.0 * ( exp2( nodeUniform27 ) - nodeVar113 ) ) );\n\t\tnodeVar114.x = ( nodeVar114.x * nodeUniform30 );\n\t\tnodeVar114.y = ( nodeVar114.y * nodeUniform31 );\n\t\tnodeVar115 = nodeVar114;\n\t\tnodeVar117 = bool( nodeUniform34 );\n\n\t\tif ( nodeVar117 ) {\n\n\t\t\tnodeVar118 = nodeVar115;\n\t\t\tnodeVar116 = vec2( nodeVar118.x, 1.0 - nodeVar118.y );\n\n\t\t} else {\n\n\t\t\tnodeVar116 = nodeVar115;\n\n\t\t}\n\n\t\tnodeVar119 = textureGrad( nodeUniform32, nodeVar116, vec2( 0.0, 0.0 ), vec2( 0.0, 0.0 ) );\n\t\tnodeVar120 = nodeVar119.xyz;\n\t\tnodeVar108 = mix( nodeVar108, nodeVar120, nodeVar109 );\n\t\t\n\n\t}\n\n\tnodeVar121 = ( radiance + ( nodeVar108 * vec3( nodeUniform35 ) ) );\n\tradiance = nodeVar121;\n\tiblIrradiance = vec3( 0.0, 0.0, 0.0 );\n\tnodeVar122 = clamp( roughnessToMip( 1.0 ), -2.0, nodeUniform27 );\n\tnodeVar123 = floor( nodeVar122 );\n\tnodeVar124 = nodeVar123;\n\tnormalWorld = normalize( ( vec4( normalView, 0.0 ) * cameraViewMatrix ).xyz );\n\tnodeVar125 = getFace( ( nodeUniform28 * vec4( vec3( normalWorld.x, ( - normalWorld.y ), normalWorld.z ), 1.0 ) ).xyz );\n\tnodeVar126 = max( ( 4.0 - nodeVar124 ), 0.0 );\n\tnodeVar124 = max( nodeVar124, 4.0 );\n\tnodeVar127 = exp2( nodeVar124 );\n\tnodeVar128 = ( ( getUV( ( nodeUniform28 * vec4( vec3( normalWorld.x, ( - normalWorld.y ), normalWorld.z ), 1.0 ) ).xyz, nodeVar125 ) * vec2( ( nodeVar127 - 2.0 ) ) ) + vec2( 1.0 ) );\n\n\tif ( ( nodeVar125 > 2.0 ) ) {\n\n\t\tnodeVar128.y = ( nodeVar128.y + nodeVar127 );\n\t\tnodeVar125 = ( nodeVar125 - 3.0 );\n\t\t\n\n\t}\n\n\tnodeVar128.x = ( nodeVar128.x + ( nodeVar125 * nodeVar127 ) );\n\tnodeVar128.x = ( nodeVar128.x + ( nodeVar126 * ( 3.0 * 16.0 ) ) );\n\tnodeVar128.y = ( nodeVar128.y + ( 4.0 * ( exp2( nodeUniform27 ) - nodeVar127 ) ) );\n\tnodeVar128.x = ( nodeVar128.x * nodeUniform30 );\n\tnodeVar128.y = ( nodeVar128.y * nodeUniform31 );\n\tnodeVar129 = nodeVar128;\n\tnodeVar131 = bool( nodeUniform36 );\n\n\tif ( nodeVar131 ) {\n\n\t\tnodeVar132 = nodeVar129;\n\t\tnodeVar130 = vec2( nodeVar132.x, 1.0 - nodeVar132.y );\n\n\t} else {\n\n\t\tnodeVar130 = nodeVar129;\n\n\t}\n\n\tnodeVar133 = textureGrad( nodeUniform32, nodeVar130, vec2( 0.0, 0.0 ), vec2( 0.0, 0.0 ) );\n\tnodeVar134 = nodeVar133.xyz;\n\tnodeVar135 = fract( nodeVar122 );\n\n\tif ( ( nodeVar135 != 0.0 ) ) {\n\n\t\tnodeVar136 = ( nodeVar123 + 1.0 );\n\t\tnodeVar137 = getFace( ( nodeUniform28 * vec4( vec3( normalWorld.x, ( - normalWorld.y ), normalWorld.z ), 1.0 ) ).xyz );\n\t\tnodeVar138 = max( ( 4.0 - nodeVar136 ), 0.0 );\n\t\tnodeVar136 = max( nodeVar136, 4.0 );\n\t\tnodeVar139 = exp2( nodeVar136 );\n\t\tnodeVar140 = ( ( getUV( ( nodeUniform28 * vec4( vec3( normalWorld.x, ( - normalWorld.y ), normalWorld.z ), 1.0 ) ).xyz, nodeVar137 ) * vec2( ( nodeVar139 - 2.0 ) ) ) + vec2( 1.0 ) );\n\n\t\tif ( ( nodeVar137 > 2.0 ) ) {\n\n\t\t\tnodeVar140.y = ( nodeVar140.y + nodeVar139 );\n\t\t\tnodeVar137 = ( nodeVar137 - 3.0 );\n\t\t\t\n\n\t\t}\n\n\t\tnodeVar140.x = ( nodeVar140.x + ( nodeVar137 * nodeVar139 ) );\n\t\tnodeVar140.x = ( nodeVar140.x + ( nodeVar138 * ( 3.0 * 16.0 ) ) );\n\t\tnodeVar140.y = ( nodeVar140.y + ( 4.0 * ( exp2( nodeUniform27 ) - nodeVar139 ) ) );\n\t\tnodeVar140.x = ( nodeVar140.x * nodeUniform30 );\n\t\tnodeVar140.y = ( nodeVar140.y * nodeUniform31 );\n\t\tnodeVar141 = nodeVar140;\n\t\tnodeVar143 = bool( nodeUniform37 );\n\n\t\tif ( nodeVar143 ) {\n\n\t\t\tnodeVar144 = nodeVar141;\n\t\t\tnodeVar142 = vec2( nodeVar144.x, 1.0 - nodeVar144.y );\n\n\t\t} else {\n\n\t\t\tnodeVar142 = nodeVar141;\n\n\t\t}\n\n\t\tnodeVar145 = textureGrad( nodeUniform32, nodeVar142, vec2( 0.0, 0.0 ), vec2( 0.0, 0.0 ) );\n\t\tnodeVar146 = nodeVar145.xyz;\n\t\tnodeVar134 = mix( nodeVar134, nodeVar146, nodeVar135 );\n\t\t\n\n\t}\n\n\tnodeVar147 = ( iblIrradiance + ( ( nodeVar134 * vec3( 3.141592653589793 ) ) * vec3( nodeUniform35 ) ) );\n\tiblIrradiance = nodeVar147;\n\tnodeVar148 = ( DiffuseContribution * vec3( 0.3183098861837907 ) );\n\tnodeVar149 = ( irradiance * nodeVar148 );\n\tnodeVar150 = nodeVar149;\n\tindirectDiffuse = vec3( 0.0, 0.0, 0.0 );\n\tnodeVar151 = ( indirectDiffuse + nodeVar150 );\n\tindirectDiffuse = nodeVar151;\n\tsingleScatteringDielectric = vec3( 0.0, 0.0, 0.0 );\n\tmultiScatteringDielectric = vec3( 0.0, 0.0, 0.0 );\n\tsingleScatteringMetallic = vec3( 0.0, 0.0, 0.0 );\n\tmultiScatteringMetallic = vec3( 0.0, 0.0, 0.0 );\n\tnodeVar152 = dot( normalView, positionViewDirection );\n\tnodeVar153 = vec2( Roughness, clamp( nodeVar152, 0.0, 1.0 ) );\n\tnodeVar155 = bool( nodeUniform38 );\n\n\tif ( nodeVar155 ) {\n\n\t\tnodeVar156 = nodeVar153;\n\t\tnodeVar154 = vec2( nodeVar156.x, 1.0 - nodeVar156.y );\n\n\t} else {\n\n\t\tnodeVar154 = nodeVar153;\n\n\t}\n\n\tnodeVar157 = texture( nodeUniform13, nodeVar154 );\n\tnodeVar158 = ( SpecularColor * vec3( nodeVar157.xy.x ) );\n\tnodeVar159 = ( SpecularF90 * nodeVar157.xy.y );\n\tnodeVar160 = ( nodeVar158 + vec3( nodeVar159 ) );\n\tnodeVar161 = ( singleScatteringDielectric + nodeVar160 );\n\tsingleScatteringDielectric = nodeVar161;\n\tnodeVar162 = ( vec3( 1.0 ) - SpecularColor );\n\tnodeVar163 = nodeVar162;\n\tnodeVar164 = ( nodeVar163 * vec3( 0.047619 ) );\n\tnodeVar165 = ( SpecularColor + nodeVar164 );\n\tnodeVar166 = ( nodeVar160 * nodeVar165 );\n\tnodeVar167 = ( nodeVar157.xy.x + nodeVar157.xy.y );\n\tnodeVar168 = ( 1.0 - nodeVar167 );\n\tnodeVar169 = nodeVar168;\n\tnodeVar170 = ( vec3( nodeVar169 ) * nodeVar165 );\n\tnodeVar171 = ( vec3( 1.0 ) - nodeVar170 );\n\tnodeVar172 = nodeVar171;\n\tnodeVar173 = ( nodeVar166 / nodeVar172 );\n\tnodeVar174 = ( nodeVar173 * vec3( nodeVar169 ) );\n\tnodeVar175 = ( multiScatteringDielectric + nodeVar174 );\n\tmultiScatteringDielectric = nodeVar175;\n\tnodeVar176 = dot( normalView, positionViewDirection );\n\tnodeVar177 = vec2( Roughness, clamp( nodeVar176, 0.0, 1.0 ) );\n\tnodeVar179 = bool( nodeUniform39 );\n\n\tif ( nodeVar179 ) {\n\n\t\tnodeVar180 = nodeVar177;\n\t\tnodeVar178 = vec2( nodeVar180.x, 1.0 - nodeVar180.y );\n\n\t} else {\n\n\t\tnodeVar178 = nodeVar177;\n\n\t}\n\n\tnodeVar181 = texture( nodeUniform13, nodeVar178 );\n\tnodeVar182 = ( DiffuseColor.xyz * vec3( nodeVar181.xy.x ) );\n\tnodeVar183 = ( SpecularF90 * nodeVar181.xy.y );\n\tnodeVar184 = ( nodeVar182 + vec3( nodeVar183 ) );\n\tnodeVar185 = ( singleScatteringMetallic + nodeVar184 );\n\tsingleScatteringMetallic = nodeVar185;\n\tnodeVar186 = ( vec3( 1.0 ) - DiffuseColor.xyz );\n\tnodeVar187 = nodeVar186;\n\tnodeVar188 = ( nodeVar187 * vec3( 0.047619 ) );\n\tnodeVar189 = ( DiffuseColor.xyz + nodeVar188 );\n\tnodeVar190 = ( nodeVar184 * nodeVar189 );\n\tnodeVar191 = ( nodeVar181.xy.x + nodeVar181.xy.y );\n\tnodeVar192 = ( 1.0 - nodeVar191 );\n\tnodeVar193 = nodeVar192;\n\tnodeVar194 = ( vec3( nodeVar193 ) * nodeVar189 );\n\tnodeVar195 = ( vec3( 1.0 ) - nodeVar194 );\n\tnodeVar196 = nodeVar195;\n\tnodeVar197 = ( nodeVar190 / nodeVar196 );\n\tnodeVar198 = ( nodeVar197 * vec3( nodeVar193 ) );\n\tnodeVar199 = ( multiScatteringMetallic + nodeVar198 );\n\tmultiScatteringMetallic = nodeVar199;\n\tnodeVar200 = mix( singleScatteringDielectric, singleScatteringMetallic, Metalness );\n\tnodeVar201 = ( radiance * nodeVar200 );\n\tnodeVar202 = mix( multiScatteringDielectric, multiScatteringMetallic, Metalness );\n\tnodeVar203 = ( iblIrradiance * vec3( 0.3183098861837907 ) );\n\tnodeVar204 = ( nodeVar202 * nodeVar203 );\n\tnodeVar205 = ( nodeVar201 + nodeVar204 );\n\tnodeVar206 = nodeVar205;\n\tnodeVar207 = ( singleScatteringDielectric + multiScatteringDielectric );\n\tnodeVar208 = ( vec3( 1.0 ) - nodeVar207 );\n\tnodeVar209 = nodeVar208;\n\tnodeVar210 = ( DiffuseContribution * nodeVar209 );\n\tnodeVar211 = ( nodeVar210 * nodeVar203 );\n\tnodeVar212 = nodeVar211;\n\tindirectSpecular = vec3( 0.0, 0.0, 0.0 );\n\tnodeVar213 = ( indirectSpecular + nodeVar206 );\n\tindirectSpecular = nodeVar213;\n\tnodeVar214 = ( indirectDiffuse + nodeVar212 );\n\tindirectDiffuse = nodeVar214;\n\tambientOcclusion = 1.0;\n\tnodeVar215 = ( indirectDiffuse * vec3( ambientOcclusion ) );\n\tindirectDiffuse = nodeVar215;\n\tnodeVar216 = dot( normalView, positionViewDirection );\n\tnodeVar217 = ( clamp( nodeVar216, 0.0, 1.0 ) + ambientOcclusion );\n\tnodeVar218 = ( Roughness * -16.0 );\n\tnodeVar219 = ( 1.0 - nodeVar218 );\n\tnodeVar220 = nodeVar219;\n\tnodeVar221 = ( - nodeVar220 );\n\tnodeVar222 = exp2( nodeVar221 );\n\tnodeVar223 = pow( nodeVar217, nodeVar222 );\n\tnodeVar224 = ( 1.0 - nodeVar223 );\n\tnodeVar225 = nodeVar224;\n\tnodeVar226 = ( ambientOcclusion - nodeVar225 );\n\tnodeVar227 = ( indirectSpecular * vec3( clamp( nodeVar226, 0.0, 1.0 ) ) );\n\tindirectSpecular = nodeVar227;\n\tnodeVar228 = ( directDiffuse + indirectDiffuse );\n\ttotalDiffuse = nodeVar228;\n\tnodeVar229 = ( directSpecular + indirectSpecular );\n\ttotalSpecular = nodeVar229;\n\tnodeVar230 = ( totalDiffuse + totalSpecular );\n\toutgoingLight = nodeVar230;\n\tnodeVar231 = max( vec4( ( outgoingLight + EmissiveColor ), DiffuseColor.w ), 0.0 );\n\tOutput = nodeVar231;\n\n\t// result\n\tfragColor = nodeVar231;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\n\n\n\n\n// uniforms\n\nlayout( std140 ) uniform render {\n\tmat4 cameraProjectionMatrix;\n\tmat4 cameraViewMatrix;\n};\n\nlayout( std140 ) uniform object {\n\tuint nodeUniform2;\n\tuint nodeUniform3;\n\tmat4 nodeUniform6;\n};\n\n\n// varyings\nvec4 v_modelViewProjection;\nvec3 v_positionView;\nvec3 positionLocal;\nvec4 VERTEX_v_modelViewProjection;\nout vec2 nodeVarying4;\n\n\n// attributes\nlayout( location = 0 ) in vec2 uv;\nlayout( location = 1 ) in vec3 position;\n\n\n// vars\nmat4 modelViewMatrix;\nvec4 VERTEX_nodeVar11;\n\n// codes\n\n\nvoid main() {\n\n\t// transforms\n\t\n\n\t// flow\n\t// code\n\n\tnodeVarying4 = uv;\n\tmodelViewMatrix = ( cameraViewMatrix * nodeUniform6 );\n\tpositionLocal = position;\n\tv_positionView = ( modelViewMatrix * vec4( positionLocal, 1.0 ) ).xyz;\n\tVERTEX_nodeVar11 = ( cameraProjectionMatrix * vec4( v_positionView, 1.0 ) );\n\tVERTEX_v_modelViewProjection = VERTEX_nodeVar11;\n\n\t// result\n\tgl_Position = VERTEX_v_modelViewProjection;\n\n\tgl_PointSize = 1.0;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\nlayout( location = 0 ) out vec4 fragColor;\n\n\n\n// uniforms\n\nlayout( std140 ) uniform object {\n\tuint nodeUniform2;\n\tuint nodeUniform3;\n\tmat4 nodeUniform6;\n};\nuniform sampler2D nodeUniform0;\nuniform sampler2D nodeUniform1;\n\n// varyings\nin vec2 nodeVarying4;\n\n\n// vars\nvec2 nodeVar0;\nvec2 nodeVar1;\nbool nodeVar2;\nvec2 nodeVar3;\nvec4 nodeVar4;\nvec2 nodeVar5;\nvec2 nodeVar6;\nbool nodeVar7;\nvec2 nodeVar8;\nvec4 nodeVar9;\nvec4 nodeVar10;\n\n// codes\nvec4 fn1 ( vec4 color ) {\n\n\tvec4 nodeVar0;\n\n\n\tif ( ( color.w == 0.0 ) ) {\n\n\t\tnodeVar0 = vec4( 0.0, 0.0, 0.0, 0.0 );\n\n\t} else {\n\n\t\tnodeVar0 = vec4( ( color.xyz / vec3( color.w ) ), color.w );\n\n\t}\n\n\n\treturn nodeVar0;\n\n}\n\nvec3 sRGBTransferOETF ( vec3 color ) {\n\n\t\n\n\n\treturn mix( ( ( pow( color, vec3( 0.41666 ) ) * vec3( 1.055 ) ) - vec3( 0.055 ) ), ( color * vec3( 12.92 ) ), vec3( lessThanEqual( color, vec3( 0.0031308 ) ) ) );\n\n}\n\nvec4 fn0 ( vec4 color ) {\n\n\t\n\n\n\treturn vec4( ( color.xyz * vec3( color.w ) ), color.w );\n\n}\n\n\n\nvoid main() {\n\n\t// flow\n\t// code\n\n\tnodeVar0 = nodeVarying4;\n\tnodeVar2 = bool( nodeUniform2 );\n\n\tif ( nodeVar2 ) {\n\n\t\tnodeVar3 = nodeVar0;\n\t\tnodeVar1 = vec2( nodeVar3.x, 1.0 - nodeVar3.y );\n\n\t} else {\n\n\t\tnodeVar1 = nodeVar0;\n\n\t}\n\n\tnodeVar4 = texture( nodeUniform1, nodeVar1 );\n\tnodeVar5 = ( nodeVarying4 - ( nodeVar4.xy * vec2( 0.00003 ) ) );\n\tnodeVar7 = bool( nodeUniform3 );\n\n\tif ( nodeVar7 ) {\n\n\t\tnodeVar8 = nodeVar5;\n\t\tnodeVar6 = vec2( nodeVar8.x, 1.0 - nodeVar8.y );\n\n\t} else {\n\n\t\tnodeVar6 = nodeVar5;\n\n\t}\n\n\tnodeVar9 = texture( nodeUniform0, nodeVar6 );\n\tnodeVar10 = fn1( vec4( nodeVar9.xyz, clamp( nodeVar9.w, 0.0, 1.0 ) ) );\n\n\t// result\n\tfragColor = fn0( vec4( sRGBTransferOETF( nodeVar10.xyz ), nodeVar10.w ) );\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\n\n\n\n\n// uniforms\n\nlayout( std140 ) uniform render {\n\tmat4 cameraProjectionMatrix;\n\tmat4 cameraViewMatrix;\n\tvec3 nodeUniform11;\n\tvec3 nodeUniform28;\n\tvec3 nodeUniform33;\n\tvec3 nodeUniform36;\n\tvec3 nodeUniform9;\n\tvec3 nodeUniform10;\n\tvec3 nodeUniform26;\n\tvec3 nodeUniform27;\n\tvec3 nodeUniform31;\n\tvec3 nodeUniform32;\n\tmat4 nodeUniform13;\n\tfloat nodeUniform14;\n\tfloat nodeUniform15;\n\tvec2 nodeUniform16;\n\tfloat nodeUniform22;\n\tmat4 cameraWorldMatrix;\n};\n\nlayout( std140 ) uniform object {\n\tvec3 nodeUniform0;\n\tfloat nodeUniform1;\n\tfloat nodeUniform2;\n\tfloat nodeUniform3;\n\tmat3 nodeUniform5;\n\tvec3 nodeUniform6;\n\tfloat nodeUniform7;\n\tmat4 nodeUniform12;\n\tuint nodeUniform18;\n\tuint nodeUniform19;\n\tuint nodeUniform20;\n\tuint nodeUniform21;\n\tuint nodeUniform24;\n\tuint nodeUniform25;\n\tuint nodeUniform29;\n\tuint nodeUniform30;\n\tuint nodeUniform34;\n\tuint nodeUniform35;\n\tfloat nodeUniform37;\n\tmat4 nodeUniform38;\n\tfloat nodeUniform40;\n\tfloat nodeUniform41;\n\tuint nodeUniform43;\n\tuint nodeUniform44;\n\tfloat nodeUniform45;\n\tuint nodeUniform46;\n\tuint nodeUniform47;\n\tuint nodeUniform48;\n\tuint nodeUniform49;\n};\n\n\n// varyings\nvec4 v_modelViewProjection;\nvec3 v_positionView;\nvec3 positionLocal;\nout vec3 v_normalViewGeometry;\nout vec3 v_positionWorld;\nout vec3 v_positionViewDirection;\nvec4 VERTEX_v_modelViewProjection;\n\n\n// attributes\nlayout( location = 0 ) in vec3 normal;\nlayout( location = 1 ) in vec3 position;\n\n\n// vars\nvec3 normalLocal;\nmat4 modelViewMatrix;\nvec4 VERTEX_nodeVar263;\n\n// codes\n\n\nvoid main() {\n\n\t// transforms\n\t\n\n\t// flow\n\t// code\n\n\tnormalLocal = normal;\n\tv_normalViewGeometry = normalize( ( cameraViewMatrix * vec4( ( nodeUniform5 * normalLocal ), 0.0 ) ).xyz );\n\tpositionLocal = position;\n\tv_positionWorld = ( nodeUniform12 * vec4( positionLocal, 1.0 ) ).xyz;\n\tmodelViewMatrix = ( cameraViewMatrix * nodeUniform12 );\n\tv_positionView = ( modelViewMatrix * vec4( positionLocal, 1.0 ) ).xyz;\n\tv_positionViewDirection = ( - v_positionView );\n\tVERTEX_nodeVar263 = ( cameraProjectionMatrix * vec4( v_positionView, 1.0 ) );\n\tVERTEX_v_modelViewProjection = VERTEX_nodeVar263;\n\n\t// result\n\tgl_Position = VERTEX_v_modelViewProjection;\n\n\tgl_PointSize = 1.0;\n\n}\n","#version 300 es\n\n// Three.js r185 - Node System\n\n\n// extensions\n\n\n// precision\n\nprecision highp float;\nprecision highp int;\nprecision highp sampler2D;\nprecision highp sampler3D;\nprecision highp samplerCube;\nprecision highp sampler2DArray;\n\nprecision highp usampler2D;\nprecision highp usampler3D;\nprecision highp usamplerCube;\nprecision highp usampler2DArray;\n\nprecision highp isampler2D;\nprecision highp isampler3D;\nprecision highp isamplerCube;\nprecision highp isampler2DArray;\n\nprecision highp sampler2DShadow;\nprecision highp sampler2DArrayShadow;\nprecision highp samplerCubeShadow;\n\n\n// structs\n\nlayout( location = 0 ) out vec4 fragColor;\n\n\n\n// uniforms\n\nlayout( std140 ) uniform object {\n\tvec3 nodeUniform0;\n\tfloat nodeUniform1;\n\tfloat nodeUniform2;\n\tfloat nodeUniform3;\n\tmat3 nodeUniform5;\n\tvec3 nodeUniform6;\n\tfloat nodeUniform7;\n\tmat4 nodeUniform12;\n\tuint nodeUniform18;\n\tuint nodeUniform19;\n\tuint nodeUniform20;\n\tuint nodeUniform21;\n\tuint nodeUniform24;\n\tuint nodeUniform25;\n\tuint nodeUniform29;\n\tuint nodeUniform30;\n\tuint nodeUniform34;\n\tuint nodeUniform35;\n\tfloat nodeUniform37;\n\tmat4 nodeUniform38;\n\tfloat nodeUniform40;\n\tfloat nodeUniform41;\n\tuint nodeUniform43;\n\tuint nodeUniform44;\n\tfloat nodeUniform45;\n\tuint nodeUniform46;\n\tuint nodeUniform47;\n\tuint nodeUniform48;\n\tuint nodeUniform49;\n};\n\nlayout( std140 ) uniform render {\n\tmat4 cameraProjectionMatrix;\n\tmat4 cameraViewMatrix;\n\tvec3 nodeUniform11;\n\tvec3 nodeUniform28;\n\tvec3 nodeUniform33;\n\tvec3 nodeUniform36;\n\tvec3 nodeUniform9;\n\tvec3 nodeUniform10;\n\tvec3 nodeUniform26;\n\tvec3 nodeUniform27;\n\tvec3 nodeUniform31;\n\tvec3 nodeUniform32;\n\tmat4 nodeUniform13;\n\tfloat nodeUniform14;\n\tfloat nodeUniform15;\n\tvec2 nodeUniform16;\n\tfloat nodeUniform22;\n\tmat4 cameraWorldMatrix;\n};\nuniform sampler2DShadow nodeUniform17;\nuniform sampler2D nodeUniform23;\nuniform sampler2D nodeUniform42;\n\n// varyings\nin vec3 v_normalViewGeometry;\nin vec3 v_positionWorld;\nin vec3 v_positionViewDirection;\n\n\n// vars\nvec4 DiffuseColor;\nfloat Metalness;\nfloat Roughness;\nvec3 normalViewGeometry;\nvec3 nodeVar0;\nvec3 SpecularColor;\nvec3 SpecularColorBlended;\nfloat SpecularF90;\nvec3 DiffuseContribution;\nvec3 EmissiveColor;\nvec4 Output;\nvec3 NORMAL_normalView;\nvec3 normalView;\nvec3 nodeVar1;\nvec4 nodeVar2;\nvec4 nodeVar3;\nvec3 nodeVar4;\nvec3 nodeVar5;\nfloat nodeVar6;\nvec3 shadowPositionWorld;\nvec3 normalWorld;\nvec4 nodeVar7;\nvec3 nodeVar8;\nvec3 nodeVar9;\nfloat nodeVar10;\nvec2 nodeVar11;\nvec2 nodeVar12;\nvec2 nodeVar13;\nbool nodeVar14;\nvec2 nodeVar15;\nvec4 nodeVar16;\nvec4 nodeVar17;\nvec2 nodeVar18;\nvec2 nodeVar19;\nbool nodeVar20;\nvec2 nodeVar21;\nvec4 nodeVar22;\nvec4 nodeVar23;\nvec2 nodeVar24;\nvec2 nodeVar25;\nbool nodeVar26;\nvec2 nodeVar27;\nvec4 nodeVar28;\nvec4 nodeVar29;\nvec2 nodeVar30;\nvec2 nodeVar31;\nbool nodeVar32;\nvec2 nodeVar33;\nvec4 nodeVar34;\nvec4 nodeVar35;\nfloat nodeVar36;\nvec3 nodeVar37;\nvec3 nodeVar38;\nvec3 nodeVar39;\nvec3 directDiffuse;\nvec3 nodeVar40;\nvec3 nodeVar41;\nvec3 nodeVar42;\nvec3 directSpecular;\nvec3 positionViewDirection;\nvec3 nodeVar43;\nfloat nodeVar44;\nfloat nodeVar45;\nfloat nodeVar46;\nvec2 nodeVar47;\nvec2 nodeVar48;\nbool nodeVar49;\nvec2 nodeVar50;\nvec4 nodeVar51;\nvec2 nodeVar52;\nvec2 nodeVar53;\nbool nodeVar54;\nvec2 nodeVar55;\nvec4 nodeVar56;\nvec3 nodeVar57;\nfloat nodeVar58;\nfloat nodeVar59;\nvec3 nodeVar60;\nvec3 nodeVar61;\nvec3 nodeVar62;\nvec3 nodeVar63;\nvec4 nodeVar64;\nvec4 nodeVar65;\nvec3 nodeVar66;\nvec3 nodeVar67;\nfloat nodeVar68;\nvec3 nodeVar69;\nvec3 nodeVar70;\nvec3 nodeVar71;\nvec3 nodeVar72;\nvec3 nodeVar73;\nvec3 nodeVar74;\nfloat nodeVar75;\nfloat nodeVar76;\nfloat nodeVar77;\nvec2 nodeVar78;\nvec2 nodeVar79;\nbool nodeVar80;\nvec2 nodeVar81;\nvec4 nodeVar82;\nvec2 nodeVar83;\nvec2 nodeVar84;\nbool nodeVar85;\nvec2 nodeVar86;\nvec4 nodeVar87;\nvec3 nodeVar88;\nfloat nodeVar89;\nfloat nodeVar90;\nvec3 nodeVar91;\nvec3 nodeVar92;\nvec3 nodeVar93;\nvec3 nodeVar94;\nvec4 nodeVar95;\nvec4 nodeVar96;\nvec3 nodeVar97;\nvec3 nodeVar98;\nfloat nodeVar99;\nvec3 nodeVar100;\nvec3 nodeVar101;\nvec3 nodeVar102;\nvec3 nodeVar103;\nvec3 nodeVar104;\nvec3 nodeVar105;\nfloat nodeVar106;\nfloat nodeVar107;\nfloat nodeVar108;\nvec2 nodeVar109;\nvec2 nodeVar110;\nbool nodeVar111;\nvec2 nodeVar112;\nvec4 nodeVar113;\nvec2 nodeVar114;\nvec2 nodeVar115;\nbool nodeVar116;\nvec2 nodeVar117;\nvec4 nodeVar118;\nvec3 nodeVar119;\nfloat nodeVar120;\nfloat nodeVar121;\nvec3 nodeVar122;\nvec3 nodeVar123;\nvec3 nodeVar124;\nvec3 irradiance;\nvec3 nodeVar125;\nvec3 radiance;\nfloat nodeVar126;\nfloat nodeVar127;\nfloat nodeVar128;\nvec3 nodeVar129;\nfloat nodeVar130;\nfloat nodeVar131;\nfloat nodeVar132;\nvec2 nodeVar133;\nvec2 nodeVar134;\nvec2 nodeVar135;\nbool nodeVar136;\nvec2 nodeVar137;\nvec4 nodeVar138;\nvec3 nodeVar139;\nfloat nodeVar140;\nfloat nodeVar141;\nfloat nodeVar142;\nfloat nodeVar143;\nfloat nodeVar144;\nvec2 nodeVar145;\nvec2 nodeVar146;\nvec2 nodeVar147;\nbool nodeVar148;\nvec2 nodeVar149;\nvec4 nodeVar150;\nvec3 nodeVar151;\nvec3 nodeVar152;\nvec3 iblIrradiance;\nfloat nodeVar153;\nfloat nodeVar154;\nfloat nodeVar155;\nfloat nodeVar156;\nfloat nodeVar157;\nfloat nodeVar158;\nvec2 nodeVar159;\nvec2 nodeVar160;\nvec2 nodeVar161;\nbool nodeVar162;\nvec2 nodeVar163;\nvec4 nodeVar164;\nvec3 nodeVar165;\nfloat nodeVar166;\nfloat nodeVar167;\nfloat nodeVar168;\nfloat nodeVar169;\nfloat nodeVar170;\nvec2 nodeVar171;\nvec2 nodeVar172;\nvec2 nodeVar173;\nbool nodeVar174;\nvec2 nodeVar175;\nvec4 nodeVar176;\nvec3 nodeVar177;\nvec3 nodeVar178;\nvec3 nodeVar179;\nvec3 nodeVar180;\nvec3 nodeVar181;\nvec3 indirectDiffuse;\nvec3 nodeVar182;\nvec3 singleScatteringDielectric;\nvec3 multiScatteringDielectric;\nvec3 singleScatteringMetallic;\nvec3 multiScatteringMetallic;\nfloat nodeVar183;\nvec2 nodeVar184;\nvec2 nodeVar185;\nbool nodeVar186;\nvec2 nodeVar187;\nvec4 nodeVar188;\nvec3 nodeVar189;\nfloat nodeVar190;\nvec3 nodeVar191;\nvec3 nodeVar192;\nvec3 nodeVar193;\nvec3 nodeVar194;\nvec3 nodeVar195;\nvec3 nodeVar196;\nvec3 nodeVar197;\nfloat nodeVar198;\nfloat nodeVar199;\nfloat nodeVar200;\nvec3 nodeVar201;\nvec3 nodeVar202;\nvec3 nodeVar203;\nvec3 nodeVar204;\nvec3 nodeVar205;\nvec3 nodeVar206;\nfloat nodeVar207;\nvec2 nodeVar208;\nvec2 nodeVar209;\nbool nodeVar210;\nvec2 nodeVar211;\nvec4 nodeVar212;\nvec3 nodeVar213;\nfloat nodeVar214;\nvec3 nodeVar215;\nvec3 nodeVar216;\nvec3 nodeVar217;\nvec3 nodeVar218;\nvec3 nodeVar219;\nvec3 nodeVar220;\nvec3 nodeVar221;\nfloat nodeVar222;\nfloat nodeVar223;\nfloat nodeVar224;\nvec3 nodeVar225;\nvec3 nodeVar226;\nvec3 nodeVar227;\nvec3 nodeVar228;\nvec3 nodeVar229;\nvec3 nodeVar230;\nvec3 nodeVar231;\nvec3 nodeVar232;\nvec3 nodeVar233;\nvec3 nodeVar234;\nvec3 nodeVar235;\nvec3 nodeVar236;\nvec3 nodeVar237;\nvec3 nodeVar238;\nvec3 nodeVar239;\nvec3 nodeVar240;\nvec3 nodeVar241;\nvec3 nodeVar242;\nvec3 nodeVar243;\nvec3 indirectSpecular;\nvec3 nodeVar244;\nvec3 nodeVar245;\nfloat ambientOcclusion;\nvec3 nodeVar246;\nfloat nodeVar247;\nfloat nodeVar248;\nfloat nodeVar249;\nfloat nodeVar250;\nfloat nodeVar251;\nfloat nodeVar252;\nfloat nodeVar253;\nfloat nodeVar254;\nfloat nodeVar255;\nfloat nodeVar256;\nfloat nodeVar257;\nvec3 nodeVar258;\nvec3 totalDiffuse;\nvec3 nodeVar259;\nvec3 totalSpecular;\nvec3 nodeVar260;\nvec3 outgoingLight;\nvec3 nodeVar261;\nvec4 nodeVar262;\n\n// codes\n\nvec4 tsl_textureGatherCompare( sampler2DShadow map, vec2 coord, ivec2 offset, float ref, bool flipY ) {\n\tif ( flipY ) offset.y = - offset.y;\n\tvec2 size = vec2( textureSize( map, 0 ) );\n\tvec2 st = floor( coord * size + vec2( offset ) - 0.5 );\n\tvec4 ij = vec4( st + 0.5, st + 1.5 ) / size.xyxy;\n\tvec4 ret = vec4(\n\t\ttextureLod( map, vec3( ij.xw, ref ), 0.0 ),\n\t\ttextureLod( map, vec3( ij.zw, ref ), 0.0 ),\n\t\ttextureLod( map, vec3( ij.zy, ref ), 0.0 ),\n\t\ttextureLod( map, vec3( ij.xy, ref ), 0.0 )\n\t);\n\treturn flipY ? ret.wzyx : ret;\n}\n\nfloat V_GGX_SmithCorrelated ( float alpha, float dotNL, float dotNV ) {\n\n\tfloat nodeVar0;\n\n\tnodeVar0 = ( alpha * alpha );\n\n\treturn ( 0.5 / max( ( ( dotNL * sqrt( ( nodeVar0 + ( ( 1.0 - nodeVar0 ) * ( dotNV * dotNV ) ) ) ) ) + ( dotNV * sqrt( ( nodeVar0 + ( ( 1.0 - nodeVar0 ) * ( dotNL * dotNL ) ) ) ) ) ), 0.000001 ) );\n\n}\n\nfloat D_GGX ( float alpha, float dotNH ) {\n\n\tfloat nodeVar0;\n\tfloat nodeVar1;\n\n\tnodeVar0 = ( alpha * alpha );\n\tnodeVar1 = ( 1.0 - ( ( dotNH * dotNH ) * ( 1.0 - nodeVar0 ) ) );\n\n\treturn ( ( nodeVar0 / ( nodeVar1 * nodeVar1 ) ) * 0.3183098861837907 );\n\n}\n\nfloat roughnessToMip ( float roughness ) {\n\n\tfloat nodeVar0;\n\n\tnodeVar0 = 0.0;\n\n\tif ( ( roughness >= 0.8 ) ) {\n\n\t\tnodeVar0 = ( ( ( ( 1.0 - roughness ) * ( -1.0 - -2.0 ) ) / ( 1.0 - 0.8 ) ) + -2.0 );\n\t\t\n\n\t} else {\n\n\n\t\tif ( ( roughness >= 0.4 ) ) {\n\n\t\t\tnodeVar0 = ( ( ( ( 0.8 - roughness ) * ( 2.0 - -1.0 ) ) / ( 0.8 - 0.4 ) ) + -1.0 );\n\t\t\t\n\n\t\t} else {\n\n\n\t\t\tif ( ( roughness >= 0.305 ) ) {\n\n\t\t\t\tnodeVar0 = ( ( ( ( 0.4 - roughness ) * ( 3.0 - 2.0 ) ) / ( 0.4 - 0.305 ) ) + 2.0 );\n\t\t\t\t\n\n\t\t\t} else {\n\n\n\t\t\t\tif ( ( roughness >= 0.21 ) ) {\n\n\t\t\t\t\tnodeVar0 = ( ( ( ( 0.305 - roughness ) * ( 4.0 - 3.0 ) ) / ( 0.305 - 0.21 ) ) + 3.0 );\n\t\t\t\t\t\n\n\t\t\t\t} else {\n\n\t\t\t\t\tnodeVar0 = ( -2.0 * log2( ( 1.16 * roughness ) ) );\n\t\t\t\t\t\n\n\t\t\t\t}\n\n\t\t\t\t\n\n\t\t\t}\n\n\t\t\t\n\n\t\t}\n\n\t\t\n\n\t}\n\n\n\treturn nodeVar0;\n\n}\n\nfloat getFace ( vec3 direction ) {\n\n\tvec3 nodeVar0;\n\tfloat nodeVar1;\n\tfloat nodeVar2;\n\tfloat nodeVar3;\n\tfloat nodeVar4;\n\tfloat nodeVar5;\n\n\tnodeVar0 = abs( direction );\n\tnodeVar1 = -1.0;\n\n\tif ( ( nodeVar0.x > nodeVar0.z ) ) {\n\n\n\t\tif ( ( nodeVar0.x > nodeVar0.y ) ) {\n\n\n\t\t\tif ( ( direction.x > 0.0 ) ) {\n\n\t\t\t\tnodeVar2 = 0.0;\n\n\t\t\t} else {\n\n\t\t\t\tnodeVar2 = 3.0;\n\n\t\t\t}\n\n\t\t\tnodeVar1 = nodeVar2;\n\t\t\t\n\n\t\t} else {\n\n\n\t\t\tif ( ( direction.y > 0.0 ) ) {\n\n\t\t\t\tnodeVar3 = 1.0;\n\n\t\t\t} else {\n\n\t\t\t\tnodeVar3 = 4.0;\n\n\t\t\t}\n\n\t\t\tnodeVar1 = nodeVar3;\n\t\t\t\n\n\t\t}\n\n\t\t\n\n\t} else {\n\n\n\t\tif ( ( nodeVar0.z > nodeVar0.y ) ) {\n\n\n\t\t\tif ( ( direction.z > 0.0 ) ) {\n\n\t\t\t\tnodeVar4 = 2.0;\n\n\t\t\t} else {\n\n\t\t\t\tnodeVar4 = 5.0;\n\n\t\t\t}\n\n\t\t\tnodeVar1 = nodeVar4;\n\t\t\t\n\n\t\t} else {\n\n\n\t\t\tif ( ( direction.y > 0.0 ) ) {\n\n\t\t\t\tnodeVar5 = 1.0;\n\n\t\t\t} else {\n\n\t\t\t\tnodeVar5 = 4.0;\n\n\t\t\t}\n\n\t\t\tnodeVar1 = nodeVar5;\n\t\t\t\n\n\t\t}\n\n\t\t\n\n\t}\n\n\n\treturn nodeVar1;\n\n}\n\nvec2 getUV ( vec3 direction, float face ) {\n\n\tvec2 nodeVar0;\n\n\tnodeVar0 = vec2( 0.0, 0.0 );\n\n\tif ( ( face == 0.0 ) ) {\n\n\t\tnodeVar0 = ( vec2( direction.z, direction.y ) / vec2( abs( direction.x ) ) );\n\t\t\n\n\t} else {\n\n\n\t\tif ( ( face == 1.0 ) ) {\n\n\t\t\tnodeVar0 = ( vec2( ( - direction.x ), ( - direction.z ) ) / vec2( abs( direction.y ) ) );\n\t\t\t\n\n\t\t} else {\n\n\n\t\t\tif ( ( face == 2.0 ) ) {\n\n\t\t\t\tnodeVar0 = ( vec2( ( - direction.x ), direction.y ) / vec2( abs( direction.z ) ) );\n\t\t\t\t\n\n\t\t\t} else {\n\n\n\t\t\t\tif ( ( face == 3.0 ) ) {\n\n\t\t\t\t\tnodeVar0 = ( vec2( ( - direction.z ), direction.y ) / vec2( abs( direction.x ) ) );\n\t\t\t\t\t\n\n\t\t\t\t} else {\n\n\n\t\t\t\t\tif ( ( face == 4.0 ) ) {\n\n\t\t\t\t\t\tnodeVar0 = ( vec2( ( - direction.x ), direction.z ) / vec2( abs( direction.y ) ) );\n\t\t\t\t\t\t\n\n\t\t\t\t\t} else {\n\n\t\t\t\t\t\tnodeVar0 = ( vec2( direction.x, direction.y ) / vec2( abs( direction.z ) ) );\n\t\t\t\t\t\t\n\n\t\t\t\t\t}\n\n\t\t\t\t\t\n\n\t\t\t\t}\n\n\t\t\t\t\n\n\t\t\t}\n\n\t\t\t\n\n\t\t}\n\n\t\t\n\n\t}\n\n\n\treturn ( vec2( 0.5 ) * ( nodeVar0 + vec2( 1.0 ) ) );\n\n}\n\n\n\nvoid main() {\n\n\t// flow\n\t// code\n\n\tDiffuseColor = vec4( nodeUniform0, 1.0 );\n\tDiffuseColor.w = ( DiffuseColor.w * nodeUniform1 );\n\tDiffuseColor.w = 1.0;\n\tMetalness = nodeUniform2;\n\tnormalViewGeometry = normalize( v_normalViewGeometry );\n\tnodeVar0 = max( abs( dFdx( normalViewGeometry ) ), abs( dFdy( normalViewGeometry ) ) );\n\tRoughness = min( ( max( nodeUniform3, 0.0525 ) + max( max( nodeVar0.x, nodeVar0.y ), nodeVar0.z ) ), 1.0 );\n\tSpecularColor = vec3( 0.04, 0.04, 0.04 );\n\tSpecularColorBlended = mix( vec3( 0.04, 0.04, 0.04 ), DiffuseColor.xyz, Metalness );\n\tSpecularF90 = 1.0;\n\tDiffuseContribution = ( DiffuseColor.xyz * vec3( ( 1.0 - nodeUniform2 ) ) );\n\tEmissiveColor = ( nodeUniform6 * vec3( nodeUniform7 ) );\n\tNORMAL_normalView = normalViewGeometry;\n\tnormalView = NORMAL_normalView;\n\tnodeVar1 = ( nodeUniform9 - nodeUniform10 );\n\tnodeVar2 = vec4( nodeVar1, 0.0 );\n\tnodeVar3 = ( cameraViewMatrix * nodeVar2 );\n\tnodeVar4 = normalize( nodeVar3.xyz );\n\tnodeVar5 = nodeVar4;\n\tnodeVar6 = dot( normalView, nodeVar5 );\n\tshadowPositionWorld = v_positionWorld;\n\tnormalWorld = normalize( ( vec4( normalView, 0.0 ) * cameraViewMatrix ).xyz );\n\tnodeVar7 = ( nodeUniform13 * vec4( ( shadowPositionWorld + ( normalWorld * vec3( nodeUniform14 ) ) ), 1.0 ) );\n\tnodeVar8 = ( nodeVar7.xyz / vec3( nodeVar7.w ) );\n\tnodeVar9 = vec3( nodeVar8.x, ( 1.0 - nodeVar8.y ), ( nodeVar8.z + nodeUniform15 ) );\n\n\tif ( ( ( ( ( ( nodeVar9.x >= 0.0 ) && ( nodeVar9.x <= 1.0 ) ) && ( nodeVar9.y >= 0.0 ) ) && ( nodeVar9.y <= 1.0 ) ) && ( nodeVar9.z <= 1.0 ) ) ) {\n\n\t\tnodeVar11 = fract( ( ( nodeVar9.xy * nodeUniform16 ) + vec2( 0.5 ) ) );\n\t\tnodeVar9.xy = ( nodeVar9.xy - ( ( nodeVar11 - vec2( 0.5 ) ) * ( vec2( 1.0, 1.0 ) / nodeUniform16 ) ) );\n\t\tnodeVar12 = nodeVar9.xy;\n\t\tnodeVar14 = bool( nodeUniform18 );\n\n\t\tif ( nodeVar14 ) {\n\n\t\t\tnodeVar15 = nodeVar12;\n\t\t\tnodeVar13 = vec2( nodeVar15.x, 1.0 - nodeVar15.y );\n\n\t\t} else {\n\n\t\t\tnodeVar13 = nodeVar12;\n\n\t\t}\n\n\t\tnodeVar16 = tsl_textureGatherCompare( nodeUniform17, nodeVar13, ivec2( -1, 1 ), nodeVar9.z, nodeVar14 );\n\t\tnodeVar17 = nodeVar16;\n\t\tnodeVar18 = nodeVar9.xy;\n\t\tnodeVar20 = bool( nodeUniform19 );\n\n\t\tif ( nodeVar20 ) {\n\n\t\t\tnodeVar21 = nodeVar18;\n\t\t\tnodeVar19 = vec2( nodeVar21.x, 1.0 - nodeVar21.y );\n\n\t\t} else {\n\n\t\t\tnodeVar19 = nodeVar18;\n\n\t\t}\n\n\t\tnodeVar22 = tsl_textureGatherCompare( nodeUniform17, nodeVar19, ivec2( 1, 1 ), nodeVar9.z, nodeVar20 );\n\t\tnodeVar23 = nodeVar22;\n\t\tnodeVar24 = nodeVar9.xy;\n\t\tnodeVar26 = bool( nodeUniform20 );\n\n\t\tif ( nodeVar26 ) {\n\n\t\t\tnodeVar27 = nodeVar24;\n\t\t\tnodeVar25 = vec2( nodeVar27.x, 1.0 - nodeVar27.y );\n\n\t\t} else {\n\n\t\t\tnodeVar25 = nodeVar24;\n\n\t\t}\n\n\t\tnodeVar28 = tsl_textureGatherCompare( nodeUniform17, nodeVar25, ivec2( -1, -1 ), nodeVar9.z, nodeVar26 );\n\t\tnodeVar29 = nodeVar28;\n\t\tnodeVar30 = nodeVar9.xy;\n\t\tnodeVar32 = bool( nodeUniform21 );\n\n\t\tif ( nodeVar32 ) {\n\n\t\t\tnodeVar33 = nodeVar30;\n\t\t\tnodeVar31 = vec2( nodeVar33.x, 1.0 - nodeVar33.y );\n\n\t\t} else {\n\n\t\t\tnodeVar31 = nodeVar30;\n\n\t\t}\n\n\t\tnodeVar34 = tsl_textureGatherCompare( nodeUniform17, nodeVar31, ivec2( 1, -1 ), nodeVar9.z, nodeVar32 );\n\t\tnodeVar35 = nodeVar34;\n\t\tnodeVar10 = ( ( ( ( ( ( ( mix( nodeVar17.x, nodeVar23.y, nodeVar11.x ) + nodeVar17.y ) + nodeVar23.x ) * nodeVar11.y ) + ( ( mix( nodeVar17.w, nodeVar23.z, nodeVar11.x ) + nodeVar17.z ) + nodeVar23.w ) ) + ( ( mix( nodeVar29.x, nodeVar35.y, nodeVar11.x ) + nodeVar29.y ) + nodeVar35.x ) ) + ( ( ( mix( nodeVar29.w, nodeVar35.z, nodeVar11.x ) + nodeVar29.z ) + nodeVar35.w ) * ( 1.0 - nodeVar11.y ) ) ) * 0.1111111111111111 );\n\n\t} else {\n\n\t\tnodeVar10 = 1.0;\n\n\t}\n\n\tnodeVar36 = mix( 1.0, nodeVar10, nodeUniform22 );\n\tnodeVar37 = ( nodeUniform11 * vec3( nodeVar36 ) );\n\tnodeVar38 = ( vec3( clamp( nodeVar6, 0.0, 1.0 ) ) * nodeVar37 );\n\tnodeVar39 = nodeVar38;\n\tdirectDiffuse = vec3( 0.0, 0.0, 0.0 );\n\tnodeVar40 = ( DiffuseContribution * vec3( 0.3183098861837907 ) );\n\tnodeVar41 = ( nodeVar39 * nodeVar40 );\n\tnodeVar42 = ( directDiffuse + nodeVar41 );\n\tdirectDiffuse = nodeVar42;\n\tdirectSpecular = vec3( 0.0, 0.0, 0.0 );\n\tpositionViewDirection = normalize( v_positionViewDirection );\n\tnodeVar43 = normalize( ( nodeVar5 + positionViewDirection ) );\n\tnodeVar44 = clamp( dot( positionViewDirection, nodeVar43 ), 0.0, 1.0 );\n\tnodeVar45 = exp2( ( ( ( nodeVar44 * -5.55473 ) - 6.98316 ) * nodeVar44 ) );\n\tnodeVar46 = ( Roughness * Roughness );\n\tnodeVar47 = vec2( Roughness, clamp( dot( normalView, positionViewDirection ), 0.0, 1.0 ) );\n\tnodeVar49 = bool( nodeUniform24 );\n\n\tif ( nodeVar49 ) {\n\n\t\tnodeVar50 = nodeVar47;\n\t\tnodeVar48 = vec2( nodeVar50.x, 1.0 - nodeVar50.y );\n\n\t} else {\n\n\t\tnodeVar48 = nodeVar47;\n\n\t}\n\n\tnodeVar51 = texture( nodeUniform23, nodeVar48 );\n\tnodeVar52 = vec2( Roughness, clamp( dot( normalView, nodeVar5 ), 0.0, 1.0 ) );\n\tnodeVar54 = bool( nodeUniform25 );\n\n\tif ( nodeVar54 ) {\n\n\t\tnodeVar55 = nodeVar52;\n\t\tnodeVar53 = vec2( nodeVar55.x, 1.0 - nodeVar55.y );\n\n\t} else {\n\n\t\tnodeVar53 = nodeVar52;\n\n\t}\n\n\tnodeVar56 = texture( nodeUniform23, nodeVar53 );\n\tnodeVar57 = ( SpecularColorBlended + ( ( vec3( 1.0 ) - SpecularColorBlended ) * vec3( 0.047619 ) ) );\n\tnodeVar58 = ( 1.0 - ( nodeVar51.xy.x + nodeVar51.xy.y ) );\n\tnodeVar59 = ( 1.0 - ( nodeVar56.xy.x + nodeVar56.xy.y ) );\n\tnodeVar60 = ( ( ( ( ( SpecularColorBlended * vec3( ( 1.0 - nodeVar45 ) ) ) + vec3( ( 1.0 * nodeVar45 ) ) ) * vec3( V_GGX_SmithCorrelated( nodeVar46, clamp( dot( normalView, nodeVar5 ), 0.0, 1.0 ), clamp( dot( normalView, positionViewDirection ), 0.0, 1.0 ) ) ) ) * vec3( D_GGX( nodeVar46, clamp( dot( normalView, nodeVar43 ), 0.0, 1.0 ) ) ) ) + ( ( ( ( ( ( SpecularColorBlended * vec3( nodeVar51.xy.x ) ) + vec3( ( 1.0 * nodeVar51.xy.y ) ) ) * ( ( SpecularColorBlended * vec3( nodeVar56.xy.x ) ) + vec3( ( 1.0 * nodeVar56.xy.y ) ) ) ) * nodeVar57 ) / ( ( vec3( 1.0 ) - ( ( vec3( ( nodeVar58 * nodeVar59 ) ) * nodeVar57 ) * nodeVar57 ) ) + vec3( 0.000001 ) ) ) * vec3( ( nodeVar58 * nodeVar59 ) ) ) );\n\tnodeVar61 = ( nodeVar39 * nodeVar60 );\n\tnodeVar62 = ( directSpecular + nodeVar61 );\n\tdirectSpecular = nodeVar62;\n\tnodeVar63 = ( nodeUniform26 - nodeUniform27 );\n\tnodeVar64 = vec4( nodeVar63, 0.0 );\n\tnodeVar65 = ( cameraViewMatrix * nodeVar64 );\n\tnodeVar66 = normalize( nodeVar65.xyz );\n\tnodeVar67 = nodeVar66;\n\tnodeVar68 = dot( normalView, nodeVar67 );\n\tnodeVar69 = ( vec3( clamp( nodeVar68, 0.0, 1.0 ) ) * nodeUniform28 );\n\tnodeVar70 = nodeVar69;\n\tnodeVar71 = ( DiffuseContribution * vec3( 0.3183098861837907 ) );\n\tnodeVar72 = ( nodeVar70 * nodeVar71 );\n\tnodeVar73 = ( directDiffuse + nodeVar72 );\n\tdirectDiffuse = nodeVar73;\n\tnodeVar74 = normalize( ( nodeVar67 + positionViewDirection ) );\n\tnodeVar75 = clamp( dot( positionViewDirection, nodeVar74 ), 0.0, 1.0 );\n\tnodeVar76 = exp2( ( ( ( nodeVar75 * -5.55473 ) - 6.98316 ) * nodeVar75 ) );\n\tnodeVar77 = ( Roughness * Roughness );\n\tnodeVar78 = vec2( Roughness, clamp( dot( normalView, positionViewDirection ), 0.0, 1.0 ) );\n\tnodeVar80 = bool( nodeUniform29 );\n\n\tif ( nodeVar80 ) {\n\n\t\tnodeVar81 = nodeVar78;\n\t\tnodeVar79 = vec2( nodeVar81.x, 1.0 - nodeVar81.y );\n\n\t} else {\n\n\t\tnodeVar79 = nodeVar78;\n\n\t}\n\n\tnodeVar82 = texture( nodeUniform23, nodeVar79 );\n\tnodeVar83 = vec2( Roughness, clamp( dot( normalView, nodeVar67 ), 0.0, 1.0 ) );\n\tnodeVar85 = bool( nodeUniform30 );\n\n\tif ( nodeVar85 ) {\n\n\t\tnodeVar86 = nodeVar83;\n\t\tnodeVar84 = vec2( nodeVar86.x, 1.0 - nodeVar86.y );\n\n\t} else {\n\n\t\tnodeVar84 = nodeVar83;\n\n\t}\n\n\tnodeVar87 = texture( nodeUniform23, nodeVar84 );\n\tnodeVar88 = ( SpecularColorBlended + ( ( vec3( 1.0 ) - SpecularColorBlended ) * vec3( 0.047619 ) ) );\n\tnodeVar89 = ( 1.0 - ( nodeVar82.xy.x + nodeVar82.xy.y ) );\n\tnodeVar90 = ( 1.0 - ( nodeVar87.xy.x + nodeVar87.xy.y ) );\n\tnodeVar91 = ( ( ( ( ( SpecularColorBlended * vec3( ( 1.0 - nodeVar76 ) ) ) + vec3( ( 1.0 * nodeVar76 ) ) ) * vec3( V_GGX_SmithCorrelated( nodeVar77, clamp( dot( normalView, nodeVar67 ), 0.0, 1.0 ), clamp( dot( normalView, positionViewDirection ), 0.0, 1.0 ) ) ) ) * vec3( D_GGX( nodeVar77, clamp( dot( normalView, nodeVar74 ), 0.0, 1.0 ) ) ) ) + ( ( ( ( ( ( SpecularColorBlended * vec3( nodeVar82.xy.x ) ) + vec3( ( 1.0 * nodeVar82.xy.y ) ) ) * ( ( SpecularColorBlended * vec3( nodeVar87.xy.x ) ) + vec3( ( 1.0 * nodeVar87.xy.y ) ) ) ) * nodeVar88 ) / ( ( vec3( 1.0 ) - ( ( vec3( ( nodeVar89 * nodeVar90 ) ) * nodeVar88 ) * nodeVar88 ) ) + vec3( 0.000001 ) ) ) * vec3( ( nodeVar89 * nodeVar90 ) ) ) );\n\tnodeVar92 = ( nodeVar70 * nodeVar91 );\n\tnodeVar93 = ( directSpecular + nodeVar92 );\n\tdirectSpecular = nodeVar93;\n\tnodeVar94 = ( nodeUniform31 - nodeUniform32 );\n\tnodeVar95 = vec4( nodeVar94, 0.0 );\n\tnodeVar96 = ( cameraViewMatrix * nodeVar95 );\n\tnodeVar97 = normalize( nodeVar96.xyz );\n\tnodeVar98 = nodeVar97;\n\tnodeVar99 = dot( normalView, nodeVar98 );\n\tnodeVar100 = ( vec3( clamp( nodeVar99, 0.0, 1.0 ) ) * nodeUniform33 );\n\tnodeVar101 = nodeVar100;\n\tnodeVar102 = ( DiffuseContribution * vec3( 0.3183098861837907 ) );\n\tnodeVar103 = ( nodeVar101 * nodeVar102 );\n\tnodeVar104 = ( directDiffuse + nodeVar103 );\n\tdirectDiffuse = nodeVar104;\n\tnodeVar105 = normalize( ( nodeVar98 + positionViewDirection ) );\n\tnodeVar106 = clamp( dot( positionViewDirection, nodeVar105 ), 0.0, 1.0 );\n\tnodeVar107 = exp2( ( ( ( nodeVar106 * -5.55473 ) - 6.98316 ) * nodeVar106 ) );\n\tnodeVar108 = ( Roughness * Roughness );\n\tnodeVar109 = vec2( Roughness, clamp( dot( normalView, positionViewDirection ), 0.0, 1.0 ) );\n\tnodeVar111 = bool( nodeUniform34 );\n\n\tif ( nodeVar111 ) {\n\n\t\tnodeVar112 = nodeVar109;\n\t\tnodeVar110 = vec2( nodeVar112.x, 1.0 - nodeVar112.y );\n\n\t} else {\n\n\t\tnodeVar110 = nodeVar109;\n\n\t}\n\n\tnodeVar113 = texture( nodeUniform23, nodeVar110 );\n\tnodeVar114 = vec2( Roughness, clamp( dot( normalView, nodeVar98 ), 0.0, 1.0 ) );\n\tnodeVar116 = bool( nodeUniform35 );\n\n\tif ( nodeVar116 ) {\n\n\t\tnodeVar117 = nodeVar114;\n\t\tnodeVar115 = vec2( nodeVar117.x, 1.0 - nodeVar117.y );\n\n\t} else {\n\n\t\tnodeVar115 = nodeVar114;\n\n\t}\n\n\tnodeVar118 = texture( nodeUniform23, nodeVar115 );\n\tnodeVar119 = ( SpecularColorBlended + ( ( vec3( 1.0 ) - SpecularColorBlended ) * vec3( 0.047619 ) ) );\n\tnodeVar120 = ( 1.0 - ( nodeVar113.xy.x + nodeVar113.xy.y ) );\n\tnodeVar121 = ( 1.0 - ( nodeVar118.xy.x + nodeVar118.xy.y ) );\n\tnodeVar122 = ( ( ( ( ( SpecularColorBlended * vec3( ( 1.0 - nodeVar107 ) ) ) + vec3( ( 1.0 * nodeVar107 ) ) ) * vec3( V_GGX_SmithCorrelated( nodeVar108, clamp( dot( normalView, nodeVar98 ), 0.0, 1.0 ), clamp( dot( normalView, positionViewDirection ), 0.0, 1.0 ) ) ) ) * vec3( D_GGX( nodeVar108, clamp( dot( normalView, nodeVar105 ), 0.0, 1.0 ) ) ) ) + ( ( ( ( ( ( SpecularColorBlended * vec3( nodeVar113.xy.x ) ) + vec3( ( 1.0 * nodeVar113.xy.y ) ) ) * ( ( SpecularColorBlended * vec3( nodeVar118.xy.x ) ) + vec3( ( 1.0 * nodeVar118.xy.y ) ) ) ) * nodeVar119 ) / ( ( vec3( 1.0 ) - ( ( vec3( ( nodeVar120 * nodeVar121 ) ) * nodeVar119 ) * nodeVar119 ) ) + vec3( 0.000001 ) ) ) * vec3( ( nodeVar120 * nodeVar121 ) ) ) );\n\tnodeVar123 = ( nodeVar101 * nodeVar122 );\n\tnodeVar124 = ( directSpecular + nodeVar123 );\n\tdirectSpecular = nodeVar124;\n\tirradiance = vec3( 0.0, 0.0, 0.0 );\n\tnodeVar125 = ( irradiance + nodeUniform36 );\n\tirradiance = nodeVar125;\n\tradiance = vec3( 0.0, 0.0, 0.0 );\n\tnodeVar126 = clamp( roughnessToMip( Roughness ), -2.0, nodeUniform37 );\n\tnodeVar127 = floor( nodeVar126 );\n\tnodeVar128 = nodeVar127;\n\tnodeVar129 = normalize( ( cameraWorldMatrix * vec4( normalize( mix( reflect( ( - positionViewDirection ), normalView ), normalView, ( ( ( Roughness * Roughness ) * Roughness ) * Roughness ) ) ), 0.0 ) ).xyz );\n\tnodeVar130 = getFace( ( nodeUniform38 * vec4( vec3( nodeVar129.x, ( - nodeVar129.y ), nodeVar129.z ), 1.0 ) ).xyz );\n\tnodeVar131 = max( ( 4.0 - nodeVar128 ), 0.0 );\n\tnodeVar128 = max( nodeVar128, 4.0 );\n\tnodeVar132 = exp2( nodeVar128 );\n\tnodeVar133 = ( ( getUV( ( nodeUniform38 * vec4( vec3( nodeVar129.x, ( - nodeVar129.y ), nodeVar129.z ), 1.0 ) ).xyz, nodeVar130 ) * vec2( ( nodeVar132 - 2.0 ) ) ) + vec2( 1.0 ) );\n\n\tif ( ( nodeVar130 > 2.0 ) ) {\n\n\t\tnodeVar133.y = ( nodeVar133.y + nodeVar132 );\n\t\tnodeVar130 = ( nodeVar130 - 3.0 );\n\t\t\n\n\t}\n\n\tnodeVar133.x = ( nodeVar133.x + ( nodeVar130 * nodeVar132 ) );\n\tnodeVar133.x = ( nodeVar133.x + ( nodeVar131 * ( 3.0 * 16.0 ) ) );\n\tnodeVar133.y = ( nodeVar133.y + ( 4.0 * ( exp2( nodeUniform37 ) - nodeVar132 ) ) );\n\tnodeVar133.x = ( nodeVar133.x * nodeUniform40 );\n\tnodeVar133.y = ( nodeVar133.y * nodeUniform41 );\n\tnodeVar134 = nodeVar133;\n\tnodeVar136 = bool( nodeUniform43 );\n\n\tif ( nodeVar136 ) {\n\n\t\tnodeVar137 = nodeVar134;\n\t\tnodeVar135 = vec2( nodeVar137.x, 1.0 - nodeVar137.y );\n\n\t} else {\n\n\t\tnodeVar135 = nodeVar134;\n\n\t}\n\n\tnodeVar138 = textureGrad( nodeUniform42, nodeVar135, vec2( 0.0, 0.0 ), vec2( 0.0, 0.0 ) );\n\tnodeVar139 = nodeVar138.xyz;\n\tnodeVar140 = fract( nodeVar126 );\n\n\tif ( ( nodeVar140 != 0.0 ) ) {\n\n\t\tnodeVar141 = ( nodeVar127 + 1.0 );\n\t\tnodeVar142 = getFace( ( nodeUniform38 * vec4( vec3( nodeVar129.x, ( - nodeVar129.y ), nodeVar129.z ), 1.0 ) ).xyz );\n\t\tnodeVar143 = max( ( 4.0 - nodeVar141 ), 0.0 );\n\t\tnodeVar141 = max( nodeVar141, 4.0 );\n\t\tnodeVar144 = exp2( nodeVar141 );\n\t\tnodeVar145 = ( ( getUV( ( nodeUniform38 * vec4( vec3( nodeVar129.x, ( - nodeVar129.y ), nodeVar129.z ), 1.0 ) ).xyz, nodeVar142 ) * vec2( ( nodeVar144 - 2.0 ) ) ) + vec2( 1.0 ) );\n\n\t\tif ( ( nodeVar142 > 2.0 ) ) {\n\n\t\t\tnodeVar145.y = ( nodeVar145.y + nodeVar144 );\n\t\t\tnodeVar142 = ( nodeVar142 - 3.0 );\n\t\t\t\n\n\t\t}\n\n\t\tnodeVar145.x = ( nodeVar145.x + ( nodeVar142 * nodeVar144 ) );\n\t\tnodeVar145.x = ( nodeVar145.x + ( nodeVar143 * ( 3.0 * 16.0 ) ) );\n\t\tnodeVar145.y = ( nodeVar145.y + ( 4.0 * ( exp2( nodeUniform37 ) - nodeVar144 ) ) );\n\t\tnodeVar145.x = ( nodeVar145.x * nodeUniform40 );\n\t\tnodeVar145.y = ( nodeVar145.y * nodeUniform41 );\n\t\tnodeVar146 = nodeVar145;\n\t\tnodeVar148 = bool( nodeUniform44 );\n\n\t\tif ( nodeVar148 ) {\n\n\t\t\tnodeVar149 = nodeVar146;\n\t\t\tnodeVar147 = vec2( nodeVar149.x, 1.0 - nodeVar149.y );\n\n\t\t} else {\n\n\t\t\tnodeVar147 = nodeVar146;\n\n\t\t}\n\n\t\tnodeVar150 = textureGrad( nodeUniform42, nodeVar147, vec2( 0.0, 0.0 ), vec2( 0.0, 0.0 ) );\n\t\tnodeVar151 = nodeVar150.xyz;\n\t\tnodeVar139 = mix( nodeVar139, nodeVar151, nodeVar140 );\n\t\t\n\n\t}\n\n\tnodeVar152 = ( radiance + ( nodeVar139 * vec3( nodeUniform45 ) ) );\n\tradiance = nodeVar152;\n\tiblIrradiance = vec3( 0.0, 0.0, 0.0 );\n\tnodeVar153 = clamp( roughnessToMip( 1.0 ), -2.0, nodeUniform37 );\n\tnodeVar154 = floor( nodeVar153 );\n\tnodeVar155 = nodeVar154;\n\tnodeVar156 = getFace( ( nodeUniform38 * vec4( vec3( normalWorld.x, ( - normalWorld.y ), normalWorld.z ), 1.0 ) ).xyz );\n\tnodeVar157 = max( ( 4.0 - nodeVar155 ), 0.0 );\n\tnodeVar155 = max( nodeVar155, 4.0 );\n\tnodeVar158 = exp2( nodeVar155 );\n\tnodeVar159 = ( ( getUV( ( nodeUniform38 * vec4( vec3( normalWorld.x, ( - normalWorld.y ), normalWorld.z ), 1.0 ) ).xyz, nodeVar156 ) * vec2( ( nodeVar158 - 2.0 ) ) ) + vec2( 1.0 ) );\n\n\tif ( ( nodeVar156 > 2.0 ) ) {\n\n\t\tnodeVar159.y = ( nodeVar159.y + nodeVar158 );\n\t\tnodeVar156 = ( nodeVar156 - 3.0 );\n\t\t\n\n\t}\n\n\tnodeVar159.x = ( nodeVar159.x + ( nodeVar156 * nodeVar158 ) );\n\tnodeVar159.x = ( nodeVar159.x + ( nodeVar157 * ( 3.0 * 16.0 ) ) );\n\tnodeVar159.y = ( nodeVar159.y + ( 4.0 * ( exp2( nodeUniform37 ) - nodeVar158 ) ) );\n\tnodeVar159.x = ( nodeVar159.x * nodeUniform40 );\n\tnodeVar159.y = ( nodeVar159.y * nodeUniform41 );\n\tnodeVar160 = nodeVar159;\n\tnodeVar162 = bool( nodeUniform46 );\n\n\tif ( nodeVar162 ) {\n\n\t\tnodeVar163 = nodeVar160;\n\t\tnodeVar161 = vec2( nodeVar163.x, 1.0 - nodeVar163.y );\n\n\t} else {\n\n\t\tnodeVar161 = nodeVar160;\n\n\t}\n\n\tnodeVar164 = textureGrad( nodeUniform42, nodeVar161, vec2( 0.0, 0.0 ), vec2( 0.0, 0.0 ) );\n\tnodeVar165 = nodeVar164.xyz;\n\tnodeVar166 = fract( nodeVar153 );\n\n\tif ( ( nodeVar166 != 0.0 ) ) {\n\n\t\tnodeVar167 = ( nodeVar154 + 1.0 );\n\t\tnodeVar168 = getFace( ( nodeUniform38 * vec4( vec3( normalWorld.x, ( - normalWorld.y ), normalWorld.z ), 1.0 ) ).xyz );\n\t\tnodeVar169 = max( ( 4.0 - nodeVar167 ), 0.0 );\n\t\tnodeVar167 = max( nodeVar167, 4.0 );\n\t\tnodeVar170 = exp2( nodeVar167 );\n\t\tnodeVar171 = ( ( getUV( ( nodeUniform38 * vec4( vec3( normalWorld.x, ( - normalWorld.y ), normalWorld.z ), 1.0 ) ).xyz, nodeVar168 ) * vec2( ( nodeVar170 - 2.0 ) ) ) + vec2( 1.0 ) );\n\n\t\tif ( ( nodeVar168 > 2.0 ) ) {\n\n\t\t\tnodeVar171.y = ( nodeVar171.y + nodeVar170 );\n\t\t\tnodeVar168 = ( nodeVar168 - 3.0 );\n\t\t\t\n\n\t\t}\n\n\t\tnodeVar171.x = ( nodeVar171.x + ( nodeVar168 * nodeVar170 ) );\n\t\tnodeVar171.x = ( nodeVar171.x + ( nodeVar169 * ( 3.0 * 16.0 ) ) );\n\t\tnodeVar171.y = ( nodeVar171.y + ( 4.0 * ( exp2( nodeUniform37 ) - nodeVar170 ) ) );\n\t\tnodeVar171.x = ( nodeVar171.x * nodeUniform40 );\n\t\tnodeVar171.y = ( nodeVar171.y * nodeUniform41 );\n\t\tnodeVar172 = nodeVar171;\n\t\tnodeVar174 = bool( nodeUniform47 );\n\n\t\tif ( nodeVar174 ) {\n\n\t\t\tnodeVar175 = nodeVar172;\n\t\t\tnodeVar173 = vec2( nodeVar175.x, 1.0 - nodeVar175.y );\n\n\t\t} else {\n\n\t\t\tnodeVar173 = nodeVar172;\n\n\t\t}\n\n\t\tnodeVar176 = textureGrad( nodeUniform42, nodeVar173, vec2( 0.0, 0.0 ), vec2( 0.0, 0.0 ) );\n\t\tnodeVar177 = nodeVar176.xyz;\n\t\tnodeVar165 = mix( nodeVar165, nodeVar177, nodeVar166 );\n\t\t\n\n\t}\n\n\tnodeVar178 = ( iblIrradiance + ( ( nodeVar165 * vec3( 3.141592653589793 ) ) * vec3( nodeUniform45 ) ) );\n\tiblIrradiance = nodeVar178;\n\tnodeVar179 = ( DiffuseContribution * vec3( 0.3183098861837907 ) );\n\tnodeVar180 = ( irradiance * nodeVar179 );\n\tnodeVar181 = nodeVar180;\n\tindirectDiffuse = vec3( 0.0, 0.0, 0.0 );\n\tnodeVar182 = ( indirectDiffuse + nodeVar181 );\n\tindirectDiffuse = nodeVar182;\n\tsingleScatteringDielectric = vec3( 0.0, 0.0, 0.0 );\n\tmultiScatteringDielectric = vec3( 0.0, 0.0, 0.0 );\n\tsingleScatteringMetallic = vec3( 0.0, 0.0, 0.0 );\n\tmultiScatteringMetallic = vec3( 0.0, 0.0, 0.0 );\n\tnodeVar183 = dot( normalView, positionViewDirection );\n\tnodeVar184 = vec2( Roughness, clamp( nodeVar183, 0.0, 1.0 ) );\n\tnodeVar186 = bool( nodeUniform48 );\n\n\tif ( nodeVar186 ) {\n\n\t\tnodeVar187 = nodeVar184;\n\t\tnodeVar185 = vec2( nodeVar187.x, 1.0 - nodeVar187.y );\n\n\t} else {\n\n\t\tnodeVar185 = nodeVar184;\n\n\t}\n\n\tnodeVar188 = texture( nodeUniform23, nodeVar185 );\n\tnodeVar189 = ( SpecularColor * vec3( nodeVar188.xy.x ) );\n\tnodeVar190 = ( SpecularF90 * nodeVar188.xy.y );\n\tnodeVar191 = ( nodeVar189 + vec3( nodeVar190 ) );\n\tnodeVar192 = ( singleScatteringDielectric + nodeVar191 );\n\tsingleScatteringDielectric = nodeVar192;\n\tnodeVar193 = ( vec3( 1.0 ) - SpecularColor );\n\tnodeVar194 = nodeVar193;\n\tnodeVar195 = ( nodeVar194 * vec3( 0.047619 ) );\n\tnodeVar196 = ( SpecularColor + nodeVar195 );\n\tnodeVar197 = ( nodeVar191 * nodeVar196 );\n\tnodeVar198 = ( nodeVar188.xy.x + nodeVar188.xy.y );\n\tnodeVar199 = ( 1.0 - nodeVar198 );\n\tnodeVar200 = nodeVar199;\n\tnodeVar201 = ( vec3( nodeVar200 ) * nodeVar196 );\n\tnodeVar202 = ( vec3( 1.0 ) - nodeVar201 );\n\tnodeVar203 = nodeVar202;\n\tnodeVar204 = ( nodeVar197 / nodeVar203 );\n\tnodeVar205 = ( nodeVar204 * vec3( nodeVar200 ) );\n\tnodeVar206 = ( multiScatteringDielectric + nodeVar205 );\n\tmultiScatteringDielectric = nodeVar206;\n\tnodeVar207 = dot( normalView, positionViewDirection );\n\tnodeVar208 = vec2( Roughness, clamp( nodeVar207, 0.0, 1.0 ) );\n\tnodeVar210 = bool( nodeUniform49 );\n\n\tif ( nodeVar210 ) {\n\n\t\tnodeVar211 = nodeVar208;\n\t\tnodeVar209 = vec2( nodeVar211.x, 1.0 - nodeVar211.y );\n\n\t} else {\n\n\t\tnodeVar209 = nodeVar208;\n\n\t}\n\n\tnodeVar212 = texture( nodeUniform23, nodeVar209 );\n\tnodeVar213 = ( DiffuseColor.xyz * vec3( nodeVar212.xy.x ) );\n\tnodeVar214 = ( SpecularF90 * nodeVar212.xy.y );\n\tnodeVar215 = ( nodeVar213 + vec3( nodeVar214 ) );\n\tnodeVar216 = ( singleScatteringMetallic + nodeVar215 );\n\tsingleScatteringMetallic = nodeVar216;\n\tnodeVar217 = ( vec3( 1.0 ) - DiffuseColor.xyz );\n\tnodeVar218 = nodeVar217;\n\tnodeVar219 = ( nodeVar218 * vec3( 0.047619 ) );\n\tnodeVar220 = ( DiffuseColor.xyz + nodeVar219 );\n\tnodeVar221 = ( nodeVar215 * nodeVar220 );\n\tnodeVar222 = ( nodeVar212.xy.x + nodeVar212.xy.y );\n\tnodeVar223 = ( 1.0 - nodeVar222 );\n\tnodeVar224 = nodeVar223;\n\tnodeVar225 = ( vec3( nodeVar224 ) * nodeVar220 );\n\tnodeVar226 = ( vec3( 1.0 ) - nodeVar225 );\n\tnodeVar227 = nodeVar226;\n\tnodeVar228 = ( nodeVar221 / nodeVar227 );\n\tnodeVar229 = ( nodeVar228 * vec3( nodeVar224 ) );\n\tnodeVar230 = ( multiScatteringMetallic + nodeVar229 );\n\tmultiScatteringMetallic = nodeVar230;\n\tnodeVar231 = mix( singleScatteringDielectric, singleScatteringMetallic, Metalness );\n\tnodeVar232 = ( radiance * nodeVar231 );\n\tnodeVar233 = mix( multiScatteringDielectric, multiScatteringMetallic, Metalness );\n\tnodeVar234 = ( iblIrradiance * vec3( 0.3183098861837907 ) );\n\tnodeVar235 = ( nodeVar233 * nodeVar234 );\n\tnodeVar236 = ( nodeVar232 + nodeVar235 );\n\tnodeVar237 = nodeVar236;\n\tnodeVar238 = ( singleScatteringDielectric + multiScatteringDielectric );\n\tnodeVar239 = ( vec3( 1.0 ) - nodeVar238 );\n\tnodeVar240 = nodeVar239;\n\tnodeVar241 = ( DiffuseContribution * nodeVar240 );\n\tnodeVar242 = ( nodeVar241 * nodeVar234 );\n\tnodeVar243 = nodeVar242;\n\tindirectSpecular = vec3( 0.0, 0.0, 0.0 );\n\tnodeVar244 = ( indirectSpecular + nodeVar237 );\n\tindirectSpecular = nodeVar244;\n\tnodeVar245 = ( indirectDiffuse + nodeVar243 );\n\tindirectDiffuse = nodeVar245;\n\tambientOcclusion = 1.0;\n\tnodeVar246 = ( indirectDiffuse * vec3( ambientOcclusion ) );\n\tindirectDiffuse = nodeVar246;\n\tnodeVar247 = dot( normalView, positionViewDirection );\n\tnodeVar248 = ( clamp( nodeVar247, 0.0, 1.0 ) + ambientOcclusion );\n\tnodeVar249 = ( Roughness * -16.0 );\n\tnodeVar250 = ( 1.0 - nodeVar249 );\n\tnodeVar251 = nodeVar250;\n\tnodeVar252 = ( - nodeVar251 );\n\tnodeVar253 = exp2( nodeVar252 );\n\tnodeVar254 = pow( nodeVar248, nodeVar253 );\n\tnodeVar255 = ( 1.0 - nodeVar254 );\n\tnodeVar256 = nodeVar255;\n\tnodeVar257 = ( ambientOcclusion - nodeVar256 );\n\tnodeVar258 = ( indirectSpecular * vec3( clamp( nodeVar257, 0.0, 1.0 ) ) );\n\tindirectSpecular = nodeVar258;\n\tnodeVar259 = ( directDiffuse + indirectDiffuse );\n\ttotalDiffuse = nodeVar259;\n\tnodeVar260 = ( directSpecular + indirectSpecular );\n\ttotalSpecular = nodeVar260;\n\tnodeVar261 = ( totalDiffuse + totalSpecular );\n\toutgoingLight = nodeVar261;\n\tnodeVar262 = max( vec4( ( outgoingLight + EmissiveColor ), DiffuseColor.w ), 0.0 );\n\tOutput = nodeVar262;\n\n\t// result\n\tfragColor = nodeVar262;\n\n}\n"],
	"nodes": [
		{
			"k": "anchor",
			"key": "auto/render-0000-pmrem_equirect",
			"path": [],
			"slot": "fragmentNode"
		},
		{
			"k": "owned",
			"owner": {
				"k": "anchor",
				"key": "auto/render-0000-pmrem_equirect",
				"path": [],
				"slot": "fragmentNode"
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "namedRenderUniform",
			"name": "cameraProjectionMatrix"
		},
		{
			"k": "namedRenderUniform",
			"name": "cameraViewMatrix"
		},
		{
			"k": "owned",
			"owner": {
				"k": "tsl",
				"name": "mediumpModelViewMatrix"
			},
			"path": [0,1,0]
		},
		{
			"k": "tsl",
			"name": "renderGroup"
		},
		{
			"k": "tsl",
			"name": "modelWorldMatrix"
		},
		{
			"k": "tsl",
			"name": "objectGroup"
		},
		{
			"k": "container",
			"key": "@material",
			"path": ["fragmentNode","node","rawInputs",0,"roughness"]
		},
		{
			"k": "container",
			"key": "@material",
			"path": ["fragmentNode","node","rawInputs",0,"mipInt"]
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"nodeClass": "textureReference",
			"uniformType": null,
			"value": {
				"container": "@material",
				"path": ["fragmentNode","node","rawInputs",0,"envMap"]
			}
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"nodeClass": "textureReference",
				"uniformType": null,
				"value": {
					"container": "@material",
					"path": ["fragmentNode","node","rawInputs",0,"envMap"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"n": 1,
				"nodeClass": "textureReference",
				"uniformType": null,
				"value": {
					"container": "@material",
					"path": ["fragmentNode","node","rawInputs",0,"envMap"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "container",
			"key": "@material",
			"path": ["fragmentNode","node","rawInputs",0,"envMap"]
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 1,
			"nodeClass": "textureReference",
			"uniformType": null,
			"value": {
				"container": "@material",
				"path": ["fragmentNode","node","rawInputs",0,"envMap"]
			}
		},
		{
			"k": "owned",
			"owner": {
				"k": "materialCache",
				"property": "opacity",
				"type": "float"
			},
			"path": ["node"],
			"prime": "reference"
		},
		{
			"k": "materialCache",
			"property": "opacity",
			"type": "float"
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"nodeClass": "textureReference",
			"uniformType": null,
			"value": {
				"container": "text/fluid",
				"path": ["fluid","_pressureTexNode"]
			}
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"nodeClass": "textureReference",
				"uniformType": null,
				"value": {
					"container": "text/fluid",
					"path": ["fluid","_pressureTexNode"]
				}
			},
			"path": ["_matrixUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"nodeClass": "textureReference",
				"uniformType": null,
				"value": {
					"container": "text/fluid",
					"path": ["fluid","_pressureTexNode"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"k": "container",
				"key": "text/fluid",
				"path": ["fluid"]
			},
			"path": [3]
		},
		{
			"k": "container",
			"key": "text/fluid",
			"path": ["fluid","_pressureTexNode"]
		},
		{
			"k": "owned",
			"owner": {
				"k": "container",
				"key": "text/fluid",
				"path": ["fluid"]
			},
			"path": [0]
		},
		{
			"k": "owned",
			"owner": {
				"k": "container",
				"key": "text/fluid",
				"path": ["fluid"]
			},
			"path": [10]
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"nodeClass": "textureReference",
			"uniformType": null,
			"value": {
				"container": "text/fluid",
				"path": ["fluid","_velocityTexNode"]
			}
		},
		{
			"k": "container",
			"key": "text/fluid",
			"path": ["fluid","_velocityTexNode","_matrixUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"nodeClass": "textureReference",
				"uniformType": null,
				"value": {
					"container": "text/fluid",
					"path": ["fluid","_velocityTexNode"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"n": 1,
				"nodeClass": "textureReference",
				"uniformType": null,
				"value": {
					"container": "text/fluid",
					"path": ["fluid","_velocityTexNode"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"n": 2,
				"nodeClass": "textureReference",
				"uniformType": null,
				"value": {
					"container": "text/fluid",
					"path": ["fluid","_velocityTexNode"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"n": 3,
				"nodeClass": "textureReference",
				"uniformType": null,
				"value": {
					"container": "text/fluid",
					"path": ["fluid","_velocityTexNode"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "container",
			"key": "text/fluid",
			"path": ["fluid","_velocityTexNode"]
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 1,
			"nodeClass": "textureReference",
			"uniformType": null,
			"value": {
				"container": "text/fluid",
				"path": ["fluid","_velocityTexNode"]
			}
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 2,
			"nodeClass": "textureReference",
			"uniformType": null,
			"value": {
				"container": "text/fluid",
				"path": ["fluid","_velocityTexNode"]
			}
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 3,
			"nodeClass": "textureReference",
			"uniformType": null,
			"value": {
				"container": "text/fluid",
				"path": ["fluid","_velocityTexNode"]
			}
		},
		{
			"k": "owned",
			"owner": {
				"k": "container",
				"key": "text/fluid",
				"path": ["fluid"]
			},
			"path": [4]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"n": 1,
				"nodeClass": "textureReference",
				"uniformType": null,
				"value": {
					"container": "text/fluid",
					"path": ["fluid","_pressureTexNode"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"n": 2,
				"nodeClass": "textureReference",
				"uniformType": null,
				"value": {
					"container": "text/fluid",
					"path": ["fluid","_pressureTexNode"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"n": 3,
				"nodeClass": "textureReference",
				"uniformType": null,
				"value": {
					"container": "text/fluid",
					"path": ["fluid","_pressureTexNode"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"nodeClass": "textureReference",
			"uniformType": null,
			"value": {
				"container": "text/fluid",
				"path": ["fluid","_divergenceTexNode"]
			}
		},
		{
			"k": "container",
			"key": "text/fluid",
			"path": ["fluid","_divergenceTexNode","_matrixUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"nodeClass": "textureReference",
				"uniformType": null,
				"value": {
					"container": "text/fluid",
					"path": ["fluid","_divergenceTexNode"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 1,
			"nodeClass": "textureReference",
			"uniformType": null,
			"value": {
				"container": "text/fluid",
				"path": ["fluid","_pressureTexNode"]
			}
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 2,
			"nodeClass": "textureReference",
			"uniformType": null,
			"value": {
				"container": "text/fluid",
				"path": ["fluid","_pressureTexNode"]
			}
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 3,
			"nodeClass": "textureReference",
			"uniformType": null,
			"value": {
				"container": "text/fluid",
				"path": ["fluid","_pressureTexNode"]
			}
		},
		{
			"k": "container",
			"key": "text/fluid",
			"path": ["fluid","_divergenceTexNode"]
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"nodeClass": "textureReference",
			"uniformType": null,
			"value": {
				"container": "text/fluid",
				"path": ["fluid","_curlTexNode"]
			}
		},
		{
			"k": "container",
			"key": "text/fluid",
			"path": ["fluid","_curlTexNode","_matrixUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"nodeClass": "textureReference",
				"uniformType": null,
				"value": {
					"container": "text/fluid",
					"path": ["fluid","_curlTexNode"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"n": 1,
				"nodeClass": "textureReference",
				"uniformType": null,
				"value": {
					"container": "text/fluid",
					"path": ["fluid","_curlTexNode"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"n": 2,
				"nodeClass": "textureReference",
				"uniformType": null,
				"value": {
					"container": "text/fluid",
					"path": ["fluid","_curlTexNode"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"n": 3,
				"nodeClass": "textureReference",
				"uniformType": null,
				"value": {
					"container": "text/fluid",
					"path": ["fluid","_curlTexNode"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"k": "container",
				"key": "text/fluid",
				"path": ["fluid"]
			},
			"path": [5]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"n": 4,
				"nodeClass": "textureReference",
				"uniformType": null,
				"value": {
					"container": "text/fluid",
					"path": ["fluid","_curlTexNode"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"nodeClass": "textureReference",
				"uniformType": null,
				"value": {
					"container": "text/fluid",
					"path": ["fluid","_velocityTexNode"]
				}
			},
			"path": ["_matrixUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"k": "container",
				"key": "text/fluid",
				"path": ["fluid"]
			},
			"path": [2]
		},
		{
			"k": "container",
			"key": "text/fluid",
			"path": ["fluid","_curlTexNode"]
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 1,
			"nodeClass": "textureReference",
			"uniformType": null,
			"value": {
				"container": "text/fluid",
				"path": ["fluid","_curlTexNode"]
			}
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 2,
			"nodeClass": "textureReference",
			"uniformType": null,
			"value": {
				"container": "text/fluid",
				"path": ["fluid","_curlTexNode"]
			}
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 3,
			"nodeClass": "textureReference",
			"uniformType": null,
			"value": {
				"container": "text/fluid",
				"path": ["fluid","_curlTexNode"]
			}
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 4,
			"nodeClass": "textureReference",
			"uniformType": null,
			"value": {
				"container": "text/fluid",
				"path": ["fluid","_curlTexNode"]
			}
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"nodeClass": "textureReference",
			"uniformType": null,
			"value": {
				"container": "text/fluid",
				"path": ["fluid","_densityTexNode"]
			}
		},
		{
			"k": "container",
			"key": "text/fluid",
			"path": ["fluid","_densityTexNode","_matrixUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"nodeClass": "textureReference",
				"uniformType": null,
				"value": {
					"container": "text/fluid",
					"path": ["fluid","_densityTexNode"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "container",
			"key": "text/fluid",
			"path": ["fluid","_advectionDissipation"]
		},
		{
			"k": "container",
			"key": "text/fluid",
			"path": ["fluid","_densityTexNode"]
		},
		{
			"k": "container",
			"key": "text/fluid",
			"path": ["fluid","_pressureTexNode","_matrixUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"k": "materialCache",
				"property": "color",
				"type": "color"
			},
			"path": ["node"],
			"prime": "reference"
		},
		{
			"k": "owned",
			"owner": {
				"k": "materialCache",
				"property": "metalness",
				"type": "float"
			},
			"path": ["node"],
			"prime": "reference"
		},
		{
			"k": "owned",
			"owner": {
				"k": "materialCache",
				"property": "roughness",
				"type": "float"
			},
			"path": ["node"],
			"prime": "reference"
		},
		{
			"k": "tsl",
			"name": "modelNormalMatrix"
		},
		{
			"k": "owned",
			"owner": {
				"k": "materialCache",
				"property": "emissive",
				"type": "color"
			},
			"path": ["node"],
			"prime": "reference"
		},
		{
			"k": "owned",
			"owner": {
				"k": "materialCache",
				"property": "emissiveIntensity",
				"type": "float"
			},
			"path": ["node"],
			"prime": "reference"
		},
		{
			"fn": "lightPosition",
			"k": "lightUniform",
			"light": 0
		},
		{
			"fn": "lightTargetPosition",
			"k": "lightUniform",
			"light": 0
		},
		{
			"k": "owned",
			"owner": {
				"k": "lightNode",
				"light": 0
			},
			"path": ["baseColorNode"]
		},
		{
			"access": null,
			"group": "objectGroup",
			"json": {
				"arrayType": "Uint16Array",
				"data": "tTDROkwxTTrSMxw57zUoOPM3pjbRODk1eTkQNPg5UjJTOvAwlDrJL786NS7aOgUt6DofLO064CrqOtEp4Tr/KDg25DhKNs44mTZeOE43LDc5OKQ13DhiNG45xDLeOTQxKzoDMFk6Oi5tOuEsbjq6K186MypJOgopLTomKAo66CaUONc2lzjJNqM4dTa8OKw17jicND45MjOXOYYx4jk4MBM6dS4pOvUsLTqsKyE6/ykEOrwo3DmQJ605GiZ4OfokrDmoNKw5ozSuOYA0rjkjNLE5DjPCOakx4DljMPw5tS4MOh0tFDrPKwc6/ynpOaMovjk8J4k5syVKOYgkBzlFI3c6IzJ2Oh8yczoEMmo6szFYOhQxRTo7MDQ6ti4mOjEtHjrvKws6DSrsOaEowDkbJ4c5gCVEOUkk+ji9Iqw4VSEHO8ovBjvKLwA7uC/0Onwv2zrqLrQ6AC6FOuwsXjrFKzY6ACoNOpko3DkHJ6A5YiVaOSQkCzloIrc4/SBfONEfaTu5LGg7uyxiO7ssVjuuLDs7eCwNOwoszzrjKpI6mClUOmcoFzrQJtM5PCWJOQIkNTkmItw4vSB9OFQfHTizHak7aymoO28pozt7KZg7hyl/O3YpTjsnKQ47lSjCOrcnczo7JiM65yTQOZsjdjnZIRc5fiCyOOceSzhTHcc3HhzSO8sl0TvTJc078CXCOx8mrTtFJn07LSY+O8Ql7DoPJZM6OiQyOs4i0DlbIWk5KiD+OG4ejzjxHB84mxtiN90Z6TurIek7tyHlO+Uh3TtBIsk7pyKgO+wiYjvNIg87RyKuOnUhRDqIINQ5SR9gOb4d6Th3HHA46BrxN1MZCDcbGPY76hz2O/sc8zs4Hew7vR3aO3wetzslH307eR8sO0wfxjqmHlU6ux3aOb0cWjmdG9g4ABpVOKwYqzc8F7c2mBX8OzYX/DtZF/k75xf0O5YY5DuXGcY7qBqRO4QbQzvSG946ihtlOs0a4jnTGVc5zRjKOLMXPjgTFm03vxRvNl4T/zsbEP87ORD8O8gQ+TsmEuo7KBTPO4QVnzvFFlQ7mhfwOs4XdjpxF+o5pBZWOacVvzinFCk4eRM1N+oRLTahEAA8GwYAPGoG/jscCPo7TArtOxYN1TuzD6k7TRFjO3wSATsvE4U6RBP0OdISVzkNErU4IhEXODwQAzfTDvA1bQ0APHoAADyJAP47HQH7O3wC8Dv6BNo7gQixO80KbzuXDBA7ew2TOvEN/jnvDVk5ig2vOOkMCDgxDNU28Aq5NaMJADwAAAA8AQD/OxUA+ztZAPI7/QDdO98BtzscA3k7fAQdO9QFoDrVBgg6WgddOV4Hqjj3BvQ3SAasNnYFhjWfBA==",
				"format": 1030,
				"height": 16,
				"magFilter": 1006,
				"minFilter": 1006,
				"name": "DFG_LUT",
				"t": "dtex",
				"type": 1016,
				"width": 16,
				"wrapS": 1001,
				"wrapT": 1001
			},
			"k": "inputValue",
			"nodeClass": "texture",
			"uniformType": null
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"json": {
					"arrayType": "Uint16Array",
					"data": "tTDROkwxTTrSMxw57zUoOPM3pjbRODk1eTkQNPg5UjJTOvAwlDrJL786NS7aOgUt6DofLO064CrqOtEp4Tr/KDg25DhKNs44mTZeOE43LDc5OKQ13DhiNG45xDLeOTQxKzoDMFk6Oi5tOuEsbjq6K186MypJOgopLTomKAo66CaUONc2lzjJNqM4dTa8OKw17jicND45MjOXOYYx4jk4MBM6dS4pOvUsLTqsKyE6/ykEOrwo3DmQJ605GiZ4OfokrDmoNKw5ozSuOYA0rjkjNLE5DjPCOakx4DljMPw5tS4MOh0tFDrPKwc6/ynpOaMovjk8J4k5syVKOYgkBzlFI3c6IzJ2Oh8yczoEMmo6szFYOhQxRTo7MDQ6ti4mOjEtHjrvKws6DSrsOaEowDkbJ4c5gCVEOUkk+ji9Iqw4VSEHO8ovBjvKLwA7uC/0Onwv2zrqLrQ6AC6FOuwsXjrFKzY6ACoNOpko3DkHJ6A5YiVaOSQkCzloIrc4/SBfONEfaTu5LGg7uyxiO7ssVjuuLDs7eCwNOwoszzrjKpI6mClUOmcoFzrQJtM5PCWJOQIkNTkmItw4vSB9OFQfHTizHak7aymoO28pozt7KZg7hyl/O3YpTjsnKQ47lSjCOrcnczo7JiM65yTQOZsjdjnZIRc5fiCyOOceSzhTHcc3HhzSO8sl0TvTJc078CXCOx8mrTtFJn07LSY+O8Ql7DoPJZM6OiQyOs4i0DlbIWk5KiD+OG4ejzjxHB84mxtiN90Z6TurIek7tyHlO+Uh3TtBIsk7pyKgO+wiYjvNIg87RyKuOnUhRDqIINQ5SR9gOb4d6Th3HHA46BrxN1MZCDcbGPY76hz2O/sc8zs4Hew7vR3aO3wetzslH307eR8sO0wfxjqmHlU6ux3aOb0cWjmdG9g4ABpVOKwYqzc8F7c2mBX8OzYX/DtZF/k75xf0O5YY5DuXGcY7qBqRO4QbQzvSG946ihtlOs0a4jnTGVc5zRjKOLMXPjgTFm03vxRvNl4T/zsbEP87ORD8O8gQ+TsmEuo7KBTPO4QVnzvFFlQ7mhfwOs4XdjpxF+o5pBZWOacVvzinFCk4eRM1N+oRLTahEAA8GwYAPGoG/jscCPo7TArtOxYN1TuzD6k7TRFjO3wSATsvE4U6RBP0OdISVzkNErU4IhEXODwQAzfTDvA1bQ0APHoAADyJAP47HQH7O3wC8Dv6BNo7gQixO80KbzuXDBA7ew2TOvEN/jnvDVk5ig2vOOkMCDgxDNU28Aq5NaMJADwAAAA8AQD/OxUA+ztZAPI7/QDdO98BtzscA3k7fAQdO9QFoDrVBgg6WgddOV4Hqjj3BvQ3SAasNnYFhjWfBA==",
					"format": 1030,
					"height": 16,
					"magFilter": 1006,
					"minFilter": 1006,
					"name": "DFG_LUT",
					"t": "dtex",
					"type": 1016,
					"width": 16,
					"wrapS": 1001,
					"wrapT": 1001
				},
				"k": "inputValue",
				"nodeClass": "texture",
				"uniformType": null
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"json": {
					"arrayType": "Uint16Array",
					"data": "tTDROkwxTTrSMxw57zUoOPM3pjbRODk1eTkQNPg5UjJTOvAwlDrJL786NS7aOgUt6DofLO064CrqOtEp4Tr/KDg25DhKNs44mTZeOE43LDc5OKQ13DhiNG45xDLeOTQxKzoDMFk6Oi5tOuEsbjq6K186MypJOgopLTomKAo66CaUONc2lzjJNqM4dTa8OKw17jicND45MjOXOYYx4jk4MBM6dS4pOvUsLTqsKyE6/ykEOrwo3DmQJ605GiZ4OfokrDmoNKw5ozSuOYA0rjkjNLE5DjPCOakx4DljMPw5tS4MOh0tFDrPKwc6/ynpOaMovjk8J4k5syVKOYgkBzlFI3c6IzJ2Oh8yczoEMmo6szFYOhQxRTo7MDQ6ti4mOjEtHjrvKws6DSrsOaEowDkbJ4c5gCVEOUkk+ji9Iqw4VSEHO8ovBjvKLwA7uC/0Onwv2zrqLrQ6AC6FOuwsXjrFKzY6ACoNOpko3DkHJ6A5YiVaOSQkCzloIrc4/SBfONEfaTu5LGg7uyxiO7ssVjuuLDs7eCwNOwoszzrjKpI6mClUOmcoFzrQJtM5PCWJOQIkNTkmItw4vSB9OFQfHTizHak7aymoO28pozt7KZg7hyl/O3YpTjsnKQ47lSjCOrcnczo7JiM65yTQOZsjdjnZIRc5fiCyOOceSzhTHcc3HhzSO8sl0TvTJc078CXCOx8mrTtFJn07LSY+O8Ql7DoPJZM6OiQyOs4i0DlbIWk5KiD+OG4ejzjxHB84mxtiN90Z6TurIek7tyHlO+Uh3TtBIsk7pyKgO+wiYjvNIg87RyKuOnUhRDqIINQ5SR9gOb4d6Th3HHA46BrxN1MZCDcbGPY76hz2O/sc8zs4Hew7vR3aO3wetzslH307eR8sO0wfxjqmHlU6ux3aOb0cWjmdG9g4ABpVOKwYqzc8F7c2mBX8OzYX/DtZF/k75xf0O5YY5DuXGcY7qBqRO4QbQzvSG946ihtlOs0a4jnTGVc5zRjKOLMXPjgTFm03vxRvNl4T/zsbEP87ORD8O8gQ+TsmEuo7KBTPO4QVnzvFFlQ7mhfwOs4XdjpxF+o5pBZWOacVvzinFCk4eRM1N+oRLTahEAA8GwYAPGoG/jscCPo7TArtOxYN1TuzD6k7TRFjO3wSATsvE4U6RBP0OdISVzkNErU4IhEXODwQAzfTDvA1bQ0APHoAADyJAP47HQH7O3wC8Dv6BNo7gQixO80KbzuXDBA7ew2TOvEN/jnvDVk5ig2vOOkMCDgxDNU28Aq5NaMJADwAAAA8AQD/OxUA+ztZAPI7/QDdO98BtzscA3k7fAQdO9QFoDrVBgg6WgddOV4Hqjj3BvQ3SAasNnYFhjWfBA==",
					"format": 1030,
					"height": 16,
					"magFilter": 1006,
					"minFilter": 1006,
					"name": "DFG_LUT",
					"t": "dtex",
					"type": 1016,
					"width": 16,
					"wrapS": 1001,
					"wrapT": 1001
				},
				"k": "inputValue",
				"n": 1,
				"nodeClass": "texture",
				"uniformType": null
			},
			"path": ["_flipYUniform"]
		},
		{
			"fn": "lightPosition",
			"k": "lightUniform",
			"light": 1
		},
		{
			"fn": "lightTargetPosition",
			"k": "lightUniform",
			"light": 1
		},
		{
			"k": "owned",
			"owner": {
				"k": "lightNode",
				"light": 1
			},
			"path": ["colorNode"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"json": {
					"arrayType": "Uint16Array",
					"data": "tTDROkwxTTrSMxw57zUoOPM3pjbRODk1eTkQNPg5UjJTOvAwlDrJL786NS7aOgUt6DofLO064CrqOtEp4Tr/KDg25DhKNs44mTZeOE43LDc5OKQ13DhiNG45xDLeOTQxKzoDMFk6Oi5tOuEsbjq6K186MypJOgopLTomKAo66CaUONc2lzjJNqM4dTa8OKw17jicND45MjOXOYYx4jk4MBM6dS4pOvUsLTqsKyE6/ykEOrwo3DmQJ605GiZ4OfokrDmoNKw5ozSuOYA0rjkjNLE5DjPCOakx4DljMPw5tS4MOh0tFDrPKwc6/ynpOaMovjk8J4k5syVKOYgkBzlFI3c6IzJ2Oh8yczoEMmo6szFYOhQxRTo7MDQ6ti4mOjEtHjrvKws6DSrsOaEowDkbJ4c5gCVEOUkk+ji9Iqw4VSEHO8ovBjvKLwA7uC/0Onwv2zrqLrQ6AC6FOuwsXjrFKzY6ACoNOpko3DkHJ6A5YiVaOSQkCzloIrc4/SBfONEfaTu5LGg7uyxiO7ssVjuuLDs7eCwNOwoszzrjKpI6mClUOmcoFzrQJtM5PCWJOQIkNTkmItw4vSB9OFQfHTizHak7aymoO28pozt7KZg7hyl/O3YpTjsnKQ47lSjCOrcnczo7JiM65yTQOZsjdjnZIRc5fiCyOOceSzhTHcc3HhzSO8sl0TvTJc078CXCOx8mrTtFJn07LSY+O8Ql7DoPJZM6OiQyOs4i0DlbIWk5KiD+OG4ejzjxHB84mxtiN90Z6TurIek7tyHlO+Uh3TtBIsk7pyKgO+wiYjvNIg87RyKuOnUhRDqIINQ5SR9gOb4d6Th3HHA46BrxN1MZCDcbGPY76hz2O/sc8zs4Hew7vR3aO3wetzslH307eR8sO0wfxjqmHlU6ux3aOb0cWjmdG9g4ABpVOKwYqzc8F7c2mBX8OzYX/DtZF/k75xf0O5YY5DuXGcY7qBqRO4QbQzvSG946ihtlOs0a4jnTGVc5zRjKOLMXPjgTFm03vxRvNl4T/zsbEP87ORD8O8gQ+TsmEuo7KBTPO4QVnzvFFlQ7mhfwOs4XdjpxF+o5pBZWOacVvzinFCk4eRM1N+oRLTahEAA8GwYAPGoG/jscCPo7TArtOxYN1TuzD6k7TRFjO3wSATsvE4U6RBP0OdISVzkNErU4IhEXODwQAzfTDvA1bQ0APHoAADyJAP47HQH7O3wC8Dv6BNo7gQixO80KbzuXDBA7ew2TOvEN/jnvDVk5ig2vOOkMCDgxDNU28Aq5NaMJADwAAAA8AQD/OxUA+ztZAPI7/QDdO98BtzscA3k7fAQdO9QFoDrVBgg6WgddOV4Hqjj3BvQ3SAasNnYFhjWfBA==",
					"format": 1030,
					"height": 16,
					"magFilter": 1006,
					"minFilter": 1006,
					"name": "DFG_LUT",
					"t": "dtex",
					"type": 1016,
					"width": 16,
					"wrapS": 1001,
					"wrapT": 1001
				},
				"k": "inputValue",
				"n": 2,
				"nodeClass": "texture",
				"uniformType": null
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"json": {
					"arrayType": "Uint16Array",
					"data": "tTDROkwxTTrSMxw57zUoOPM3pjbRODk1eTkQNPg5UjJTOvAwlDrJL786NS7aOgUt6DofLO064CrqOtEp4Tr/KDg25DhKNs44mTZeOE43LDc5OKQ13DhiNG45xDLeOTQxKzoDMFk6Oi5tOuEsbjq6K186MypJOgopLTomKAo66CaUONc2lzjJNqM4dTa8OKw17jicND45MjOXOYYx4jk4MBM6dS4pOvUsLTqsKyE6/ykEOrwo3DmQJ605GiZ4OfokrDmoNKw5ozSuOYA0rjkjNLE5DjPCOakx4DljMPw5tS4MOh0tFDrPKwc6/ynpOaMovjk8J4k5syVKOYgkBzlFI3c6IzJ2Oh8yczoEMmo6szFYOhQxRTo7MDQ6ti4mOjEtHjrvKws6DSrsOaEowDkbJ4c5gCVEOUkk+ji9Iqw4VSEHO8ovBjvKLwA7uC/0Onwv2zrqLrQ6AC6FOuwsXjrFKzY6ACoNOpko3DkHJ6A5YiVaOSQkCzloIrc4/SBfONEfaTu5LGg7uyxiO7ssVjuuLDs7eCwNOwoszzrjKpI6mClUOmcoFzrQJtM5PCWJOQIkNTkmItw4vSB9OFQfHTizHak7aymoO28pozt7KZg7hyl/O3YpTjsnKQ47lSjCOrcnczo7JiM65yTQOZsjdjnZIRc5fiCyOOceSzhTHcc3HhzSO8sl0TvTJc078CXCOx8mrTtFJn07LSY+O8Ql7DoPJZM6OiQyOs4i0DlbIWk5KiD+OG4ejzjxHB84mxtiN90Z6TurIek7tyHlO+Uh3TtBIsk7pyKgO+wiYjvNIg87RyKuOnUhRDqIINQ5SR9gOb4d6Th3HHA46BrxN1MZCDcbGPY76hz2O/sc8zs4Hew7vR3aO3wetzslH307eR8sO0wfxjqmHlU6ux3aOb0cWjmdG9g4ABpVOKwYqzc8F7c2mBX8OzYX/DtZF/k75xf0O5YY5DuXGcY7qBqRO4QbQzvSG946ihtlOs0a4jnTGVc5zRjKOLMXPjgTFm03vxRvNl4T/zsbEP87ORD8O8gQ+TsmEuo7KBTPO4QVnzvFFlQ7mhfwOs4XdjpxF+o5pBZWOacVvzinFCk4eRM1N+oRLTahEAA8GwYAPGoG/jscCPo7TArtOxYN1TuzD6k7TRFjO3wSATsvE4U6RBP0OdISVzkNErU4IhEXODwQAzfTDvA1bQ0APHoAADyJAP47HQH7O3wC8Dv6BNo7gQixO80KbzuXDBA7ew2TOvEN/jnvDVk5ig2vOOkMCDgxDNU28Aq5NaMJADwAAAA8AQD/OxUA+ztZAPI7/QDdO98BtzscA3k7fAQdO9QFoDrVBgg6WgddOV4Hqjj3BvQ3SAasNnYFhjWfBA==",
					"format": 1030,
					"height": 16,
					"magFilter": 1006,
					"minFilter": 1006,
					"name": "DFG_LUT",
					"t": "dtex",
					"type": 1016,
					"width": 16,
					"wrapS": 1001,
					"wrapT": 1001
				},
				"k": "inputValue",
				"n": 3,
				"nodeClass": "texture",
				"uniformType": null
			},
			"path": ["_flipYUniform"]
		},
		{
			"fn": "lightPosition",
			"k": "lightUniform",
			"light": 2
		},
		{
			"fn": "lightTargetPosition",
			"k": "lightUniform",
			"light": 2
		},
		{
			"k": "owned",
			"owner": {
				"k": "lightNode",
				"light": 2
			},
			"path": ["colorNode"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"json": {
					"arrayType": "Uint16Array",
					"data": "tTDROkwxTTrSMxw57zUoOPM3pjbRODk1eTkQNPg5UjJTOvAwlDrJL786NS7aOgUt6DofLO064CrqOtEp4Tr/KDg25DhKNs44mTZeOE43LDc5OKQ13DhiNG45xDLeOTQxKzoDMFk6Oi5tOuEsbjq6K186MypJOgopLTomKAo66CaUONc2lzjJNqM4dTa8OKw17jicND45MjOXOYYx4jk4MBM6dS4pOvUsLTqsKyE6/ykEOrwo3DmQJ605GiZ4OfokrDmoNKw5ozSuOYA0rjkjNLE5DjPCOakx4DljMPw5tS4MOh0tFDrPKwc6/ynpOaMovjk8J4k5syVKOYgkBzlFI3c6IzJ2Oh8yczoEMmo6szFYOhQxRTo7MDQ6ti4mOjEtHjrvKws6DSrsOaEowDkbJ4c5gCVEOUkk+ji9Iqw4VSEHO8ovBjvKLwA7uC/0Onwv2zrqLrQ6AC6FOuwsXjrFKzY6ACoNOpko3DkHJ6A5YiVaOSQkCzloIrc4/SBfONEfaTu5LGg7uyxiO7ssVjuuLDs7eCwNOwoszzrjKpI6mClUOmcoFzrQJtM5PCWJOQIkNTkmItw4vSB9OFQfHTizHak7aymoO28pozt7KZg7hyl/O3YpTjsnKQ47lSjCOrcnczo7JiM65yTQOZsjdjnZIRc5fiCyOOceSzhTHcc3HhzSO8sl0TvTJc078CXCOx8mrTtFJn07LSY+O8Ql7DoPJZM6OiQyOs4i0DlbIWk5KiD+OG4ejzjxHB84mxtiN90Z6TurIek7tyHlO+Uh3TtBIsk7pyKgO+wiYjvNIg87RyKuOnUhRDqIINQ5SR9gOb4d6Th3HHA46BrxN1MZCDcbGPY76hz2O/sc8zs4Hew7vR3aO3wetzslH307eR8sO0wfxjqmHlU6ux3aOb0cWjmdG9g4ABpVOKwYqzc8F7c2mBX8OzYX/DtZF/k75xf0O5YY5DuXGcY7qBqRO4QbQzvSG946ihtlOs0a4jnTGVc5zRjKOLMXPjgTFm03vxRvNl4T/zsbEP87ORD8O8gQ+TsmEuo7KBTPO4QVnzvFFlQ7mhfwOs4XdjpxF+o5pBZWOacVvzinFCk4eRM1N+oRLTahEAA8GwYAPGoG/jscCPo7TArtOxYN1TuzD6k7TRFjO3wSATsvE4U6RBP0OdISVzkNErU4IhEXODwQAzfTDvA1bQ0APHoAADyJAP47HQH7O3wC8Dv6BNo7gQixO80KbzuXDBA7ew2TOvEN/jnvDVk5ig2vOOkMCDgxDNU28Aq5NaMJADwAAAA8AQD/OxUA+ztZAPI7/QDdO98BtzscA3k7fAQdO9QFoDrVBgg6WgddOV4Hqjj3BvQ3SAasNnYFhjWfBA==",
					"format": 1030,
					"height": 16,
					"magFilter": 1006,
					"minFilter": 1006,
					"name": "DFG_LUT",
					"t": "dtex",
					"type": 1016,
					"width": 16,
					"wrapS": 1001,
					"wrapT": 1001
				},
				"k": "inputValue",
				"n": 4,
				"nodeClass": "texture",
				"uniformType": null
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"json": {
					"arrayType": "Uint16Array",
					"data": "tTDROkwxTTrSMxw57zUoOPM3pjbRODk1eTkQNPg5UjJTOvAwlDrJL786NS7aOgUt6DofLO064CrqOtEp4Tr/KDg25DhKNs44mTZeOE43LDc5OKQ13DhiNG45xDLeOTQxKzoDMFk6Oi5tOuEsbjq6K186MypJOgopLTomKAo66CaUONc2lzjJNqM4dTa8OKw17jicND45MjOXOYYx4jk4MBM6dS4pOvUsLTqsKyE6/ykEOrwo3DmQJ605GiZ4OfokrDmoNKw5ozSuOYA0rjkjNLE5DjPCOakx4DljMPw5tS4MOh0tFDrPKwc6/ynpOaMovjk8J4k5syVKOYgkBzlFI3c6IzJ2Oh8yczoEMmo6szFYOhQxRTo7MDQ6ti4mOjEtHjrvKws6DSrsOaEowDkbJ4c5gCVEOUkk+ji9Iqw4VSEHO8ovBjvKLwA7uC/0Onwv2zrqLrQ6AC6FOuwsXjrFKzY6ACoNOpko3DkHJ6A5YiVaOSQkCzloIrc4/SBfONEfaTu5LGg7uyxiO7ssVjuuLDs7eCwNOwoszzrjKpI6mClUOmcoFzrQJtM5PCWJOQIkNTkmItw4vSB9OFQfHTizHak7aymoO28pozt7KZg7hyl/O3YpTjsnKQ47lSjCOrcnczo7JiM65yTQOZsjdjnZIRc5fiCyOOceSzhTHcc3HhzSO8sl0TvTJc078CXCOx8mrTtFJn07LSY+O8Ql7DoPJZM6OiQyOs4i0DlbIWk5KiD+OG4ejzjxHB84mxtiN90Z6TurIek7tyHlO+Uh3TtBIsk7pyKgO+wiYjvNIg87RyKuOnUhRDqIINQ5SR9gOb4d6Th3HHA46BrxN1MZCDcbGPY76hz2O/sc8zs4Hew7vR3aO3wetzslH307eR8sO0wfxjqmHlU6ux3aOb0cWjmdG9g4ABpVOKwYqzc8F7c2mBX8OzYX/DtZF/k75xf0O5YY5DuXGcY7qBqRO4QbQzvSG946ihtlOs0a4jnTGVc5zRjKOLMXPjgTFm03vxRvNl4T/zsbEP87ORD8O8gQ+TsmEuo7KBTPO4QVnzvFFlQ7mhfwOs4XdjpxF+o5pBZWOacVvzinFCk4eRM1N+oRLTahEAA8GwYAPGoG/jscCPo7TArtOxYN1TuzD6k7TRFjO3wSATsvE4U6RBP0OdISVzkNErU4IhEXODwQAzfTDvA1bQ0APHoAADyJAP47HQH7O3wC8Dv6BNo7gQixO80KbzuXDBA7ew2TOvEN/jnvDVk5ig2vOOkMCDgxDNU28Aq5NaMJADwAAAA8AQD/OxUA+ztZAPI7/QDdO98BtzscA3k7fAQdO9QFoDrVBgg6WgddOV4Hqjj3BvQ3SAasNnYFhjWfBA==",
					"format": 1030,
					"height": 16,
					"magFilter": 1006,
					"minFilter": 1006,
					"name": "DFG_LUT",
					"t": "dtex",
					"type": 1016,
					"width": 16,
					"wrapS": 1001,
					"wrapT": 1001
				},
				"k": "inputValue",
				"n": 5,
				"nodeClass": "texture",
				"uniformType": null
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"k": "lightNode",
				"light": 3
			},
			"path": ["colorNode"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"k": "inputNode",
				"nodeClass": "pmremTexture",
				"uniformType": null,
				"value": {
					"container": "@scene",
					"path": ["environment"]
				}
			},
			"path": ["_maxMip"]
		},
		{
			"k": "tsl",
			"name": "materialEnvRotation"
		},
		{
			"k": "namedRenderUniform",
			"name": "cameraWorldMatrix"
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"k": "inputNode",
				"nodeClass": "pmremTexture",
				"uniformType": null,
				"value": {
					"container": "@scene",
					"path": ["environment"]
				}
			},
			"path": ["_width"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"k": "inputNode",
				"nodeClass": "pmremTexture",
				"uniformType": null,
				"value": {
					"container": "@scene",
					"path": ["environment"]
				}
			},
			"path": ["_height"]
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"nodeClass": "texture",
			"uniformType": null,
			"value": {
				"container": "@scene",
				"path": ["environment"]
			}
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"nodeClass": "texture",
				"uniformType": null,
				"value": {
					"container": "@scene",
					"path": ["environment"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"n": 2,
				"nodeClass": "texture",
				"uniformType": null,
				"value": {
					"container": "@scene",
					"path": ["environment"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "tsl",
			"name": "materialEnvIntensity"
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"n": 3,
				"nodeClass": "texture",
				"uniformType": null,
				"value": {
					"container": "@scene",
					"path": ["environment"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"k": "inputNode",
				"n": 4,
				"nodeClass": "texture",
				"uniformType": null,
				"value": {
					"container": "@scene",
					"path": ["environment"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"json": {
					"arrayType": "Uint16Array",
					"data": "tTDROkwxTTrSMxw57zUoOPM3pjbRODk1eTkQNPg5UjJTOvAwlDrJL786NS7aOgUt6DofLO064CrqOtEp4Tr/KDg25DhKNs44mTZeOE43LDc5OKQ13DhiNG45xDLeOTQxKzoDMFk6Oi5tOuEsbjq6K186MypJOgopLTomKAo66CaUONc2lzjJNqM4dTa8OKw17jicND45MjOXOYYx4jk4MBM6dS4pOvUsLTqsKyE6/ykEOrwo3DmQJ605GiZ4OfokrDmoNKw5ozSuOYA0rjkjNLE5DjPCOakx4DljMPw5tS4MOh0tFDrPKwc6/ynpOaMovjk8J4k5syVKOYgkBzlFI3c6IzJ2Oh8yczoEMmo6szFYOhQxRTo7MDQ6ti4mOjEtHjrvKws6DSrsOaEowDkbJ4c5gCVEOUkk+ji9Iqw4VSEHO8ovBjvKLwA7uC/0Onwv2zrqLrQ6AC6FOuwsXjrFKzY6ACoNOpko3DkHJ6A5YiVaOSQkCzloIrc4/SBfONEfaTu5LGg7uyxiO7ssVjuuLDs7eCwNOwoszzrjKpI6mClUOmcoFzrQJtM5PCWJOQIkNTkmItw4vSB9OFQfHTizHak7aymoO28pozt7KZg7hyl/O3YpTjsnKQ47lSjCOrcnczo7JiM65yTQOZsjdjnZIRc5fiCyOOceSzhTHcc3HhzSO8sl0TvTJc078CXCOx8mrTtFJn07LSY+O8Ql7DoPJZM6OiQyOs4i0DlbIWk5KiD+OG4ejzjxHB84mxtiN90Z6TurIek7tyHlO+Uh3TtBIsk7pyKgO+wiYjvNIg87RyKuOnUhRDqIINQ5SR9gOb4d6Th3HHA46BrxN1MZCDcbGPY76hz2O/sc8zs4Hew7vR3aO3wetzslH307eR8sO0wfxjqmHlU6ux3aOb0cWjmdG9g4ABpVOKwYqzc8F7c2mBX8OzYX/DtZF/k75xf0O5YY5DuXGcY7qBqRO4QbQzvSG946ihtlOs0a4jnTGVc5zRjKOLMXPjgTFm03vxRvNl4T/zsbEP87ORD8O8gQ+TsmEuo7KBTPO4QVnzvFFlQ7mhfwOs4XdjpxF+o5pBZWOacVvzinFCk4eRM1N+oRLTahEAA8GwYAPGoG/jscCPo7TArtOxYN1TuzD6k7TRFjO3wSATsvE4U6RBP0OdISVzkNErU4IhEXODwQAzfTDvA1bQ0APHoAADyJAP47HQH7O3wC8Dv6BNo7gQixO80KbzuXDBA7ew2TOvEN/jnvDVk5ig2vOOkMCDgxDNU28Aq5NaMJADwAAAA8AQD/OxUA+ztZAPI7/QDdO98BtzscA3k7fAQdO9QFoDrVBgg6WgddOV4Hqjj3BvQ3SAasNnYFhjWfBA==",
					"format": 1030,
					"height": 16,
					"magFilter": 1006,
					"minFilter": 1006,
					"name": "DFG_LUT",
					"t": "dtex",
					"type": 1016,
					"width": 16,
					"wrapS": 1001,
					"wrapT": 1001
				},
				"k": "inputValue",
				"n": 6,
				"nodeClass": "texture",
				"uniformType": null
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"group": "objectGroup",
				"json": {
					"arrayType": "Uint16Array",
					"data": "tTDROkwxTTrSMxw57zUoOPM3pjbRODk1eTkQNPg5UjJTOvAwlDrJL786NS7aOgUt6DofLO064CrqOtEp4Tr/KDg25DhKNs44mTZeOE43LDc5OKQ13DhiNG45xDLeOTQxKzoDMFk6Oi5tOuEsbjq6K186MypJOgopLTomKAo66CaUONc2lzjJNqM4dTa8OKw17jicND45MjOXOYYx4jk4MBM6dS4pOvUsLTqsKyE6/ykEOrwo3DmQJ605GiZ4OfokrDmoNKw5ozSuOYA0rjkjNLE5DjPCOakx4DljMPw5tS4MOh0tFDrPKwc6/ynpOaMovjk8J4k5syVKOYgkBzlFI3c6IzJ2Oh8yczoEMmo6szFYOhQxRTo7MDQ6ti4mOjEtHjrvKws6DSrsOaEowDkbJ4c5gCVEOUkk+ji9Iqw4VSEHO8ovBjvKLwA7uC/0Onwv2zrqLrQ6AC6FOuwsXjrFKzY6ACoNOpko3DkHJ6A5YiVaOSQkCzloIrc4/SBfONEfaTu5LGg7uyxiO7ssVjuuLDs7eCwNOwoszzrjKpI6mClUOmcoFzrQJtM5PCWJOQIkNTkmItw4vSB9OFQfHTizHak7aymoO28pozt7KZg7hyl/O3YpTjsnKQ47lSjCOrcnczo7JiM65yTQOZsjdjnZIRc5fiCyOOceSzhTHcc3HhzSO8sl0TvTJc078CXCOx8mrTtFJn07LSY+O8Ql7DoPJZM6OiQyOs4i0DlbIWk5KiD+OG4ejzjxHB84mxtiN90Z6TurIek7tyHlO+Uh3TtBIsk7pyKgO+wiYjvNIg87RyKuOnUhRDqIINQ5SR9gOb4d6Th3HHA46BrxN1MZCDcbGPY76hz2O/sc8zs4Hew7vR3aO3wetzslH307eR8sO0wfxjqmHlU6ux3aOb0cWjmdG9g4ABpVOKwYqzc8F7c2mBX8OzYX/DtZF/k75xf0O5YY5DuXGcY7qBqRO4QbQzvSG946ihtlOs0a4jnTGVc5zRjKOLMXPjgTFm03vxRvNl4T/zsbEP87ORD8O8gQ+TsmEuo7KBTPO4QVnzvFFlQ7mhfwOs4XdjpxF+o5pBZWOacVvzinFCk4eRM1N+oRLTahEAA8GwYAPGoG/jscCPo7TArtOxYN1TuzD6k7TRFjO3wSATsvE4U6RBP0OdISVzkNErU4IhEXODwQAzfTDvA1bQ0APHoAADyJAP47HQH7O3wC8Dv6BNo7gQixO80KbzuXDBA7ew2TOvEN/jnvDVk5ig2vOOkMCDgxDNU28Aq5NaMJADwAAAA8AQD/OxUA+ztZAPI7/QDdO98BtzscA3k7fAQdO9QFoDrVBgg6WgddOV4Hqjj3BvQ3SAasNnYFhjWfBA==",
					"format": 1030,
					"height": 16,
					"magFilter": 1006,
					"minFilter": 1006,
					"name": "DFG_LUT",
					"t": "dtex",
					"type": 1016,
					"width": 16,
					"wrapS": 1001,
					"wrapT": 1001
				},
				"k": "inputValue",
				"n": 7,
				"nodeClass": "texture",
				"uniformType": null
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "materialCache",
			"property": "color",
			"type": "color"
		},
		{
			"k": "materialCache",
			"property": "metalness",
			"type": "float"
		},
		{
			"k": "materialCache",
			"property": "roughness",
			"type": "float"
		},
		{
			"k": "materialCache",
			"property": "emissive",
			"type": "color"
		},
		{
			"k": "materialCache",
			"property": "emissiveIntensity",
			"type": "float"
		},
		{
			"k": "lightNode",
			"light": 0
		},
		{
			"k": "lightNode",
			"light": 1
		},
		{
			"k": "lightNode",
			"light": 2
		},
		{
			"k": "lightNode",
			"light": 3
		},
		{
			"access": null,
			"group": "objectGroup",
			"json": {
				"arrayType": "Uint16Array",
				"data": "tTDROkwxTTrSMxw57zUoOPM3pjbRODk1eTkQNPg5UjJTOvAwlDrJL786NS7aOgUt6DofLO064CrqOtEp4Tr/KDg25DhKNs44mTZeOE43LDc5OKQ13DhiNG45xDLeOTQxKzoDMFk6Oi5tOuEsbjq6K186MypJOgopLTomKAo66CaUONc2lzjJNqM4dTa8OKw17jicND45MjOXOYYx4jk4MBM6dS4pOvUsLTqsKyE6/ykEOrwo3DmQJ605GiZ4OfokrDmoNKw5ozSuOYA0rjkjNLE5DjPCOakx4DljMPw5tS4MOh0tFDrPKwc6/ynpOaMovjk8J4k5syVKOYgkBzlFI3c6IzJ2Oh8yczoEMmo6szFYOhQxRTo7MDQ6ti4mOjEtHjrvKws6DSrsOaEowDkbJ4c5gCVEOUkk+ji9Iqw4VSEHO8ovBjvKLwA7uC/0Onwv2zrqLrQ6AC6FOuwsXjrFKzY6ACoNOpko3DkHJ6A5YiVaOSQkCzloIrc4/SBfONEfaTu5LGg7uyxiO7ssVjuuLDs7eCwNOwoszzrjKpI6mClUOmcoFzrQJtM5PCWJOQIkNTkmItw4vSB9OFQfHTizHak7aymoO28pozt7KZg7hyl/O3YpTjsnKQ47lSjCOrcnczo7JiM65yTQOZsjdjnZIRc5fiCyOOceSzhTHcc3HhzSO8sl0TvTJc078CXCOx8mrTtFJn07LSY+O8Ql7DoPJZM6OiQyOs4i0DlbIWk5KiD+OG4ejzjxHB84mxtiN90Z6TurIek7tyHlO+Uh3TtBIsk7pyKgO+wiYjvNIg87RyKuOnUhRDqIINQ5SR9gOb4d6Th3HHA46BrxN1MZCDcbGPY76hz2O/sc8zs4Hew7vR3aO3wetzslH307eR8sO0wfxjqmHlU6ux3aOb0cWjmdG9g4ABpVOKwYqzc8F7c2mBX8OzYX/DtZF/k75xf0O5YY5DuXGcY7qBqRO4QbQzvSG946ihtlOs0a4jnTGVc5zRjKOLMXPjgTFm03vxRvNl4T/zsbEP87ORD8O8gQ+TsmEuo7KBTPO4QVnzvFFlQ7mhfwOs4XdjpxF+o5pBZWOacVvzinFCk4eRM1N+oRLTahEAA8GwYAPGoG/jscCPo7TArtOxYN1TuzD6k7TRFjO3wSATsvE4U6RBP0OdISVzkNErU4IhEXODwQAzfTDvA1bQ0APHoAADyJAP47HQH7O3wC8Dv6BNo7gQixO80KbzuXDBA7ew2TOvEN/jnvDVk5ig2vOOkMCDgxDNU28Aq5NaMJADwAAAA8AQD/OxUA+ztZAPI7/QDdO98BtzscA3k7fAQdO9QFoDrVBgg6WgddOV4Hqjj3BvQ3SAasNnYFhjWfBA==",
				"format": 1030,
				"height": 16,
				"magFilter": 1006,
				"minFilter": 1006,
				"name": "DFG_LUT",
				"t": "dtex",
				"type": 1016,
				"width": 16,
				"wrapS": 1001,
				"wrapT": 1001
			},
			"k": "inputValue",
			"n": 1,
			"nodeClass": "texture",
			"uniformType": null
		},
		{
			"access": null,
			"group": "objectGroup",
			"json": {
				"arrayType": "Uint16Array",
				"data": "tTDROkwxTTrSMxw57zUoOPM3pjbRODk1eTkQNPg5UjJTOvAwlDrJL786NS7aOgUt6DofLO064CrqOtEp4Tr/KDg25DhKNs44mTZeOE43LDc5OKQ13DhiNG45xDLeOTQxKzoDMFk6Oi5tOuEsbjq6K186MypJOgopLTomKAo66CaUONc2lzjJNqM4dTa8OKw17jicND45MjOXOYYx4jk4MBM6dS4pOvUsLTqsKyE6/ykEOrwo3DmQJ605GiZ4OfokrDmoNKw5ozSuOYA0rjkjNLE5DjPCOakx4DljMPw5tS4MOh0tFDrPKwc6/ynpOaMovjk8J4k5syVKOYgkBzlFI3c6IzJ2Oh8yczoEMmo6szFYOhQxRTo7MDQ6ti4mOjEtHjrvKws6DSrsOaEowDkbJ4c5gCVEOUkk+ji9Iqw4VSEHO8ovBjvKLwA7uC/0Onwv2zrqLrQ6AC6FOuwsXjrFKzY6ACoNOpko3DkHJ6A5YiVaOSQkCzloIrc4/SBfONEfaTu5LGg7uyxiO7ssVjuuLDs7eCwNOwoszzrjKpI6mClUOmcoFzrQJtM5PCWJOQIkNTkmItw4vSB9OFQfHTizHak7aymoO28pozt7KZg7hyl/O3YpTjsnKQ47lSjCOrcnczo7JiM65yTQOZsjdjnZIRc5fiCyOOceSzhTHcc3HhzSO8sl0TvTJc078CXCOx8mrTtFJn07LSY+O8Ql7DoPJZM6OiQyOs4i0DlbIWk5KiD+OG4ejzjxHB84mxtiN90Z6TurIek7tyHlO+Uh3TtBIsk7pyKgO+wiYjvNIg87RyKuOnUhRDqIINQ5SR9gOb4d6Th3HHA46BrxN1MZCDcbGPY76hz2O/sc8zs4Hew7vR3aO3wetzslH307eR8sO0wfxjqmHlU6ux3aOb0cWjmdG9g4ABpVOKwYqzc8F7c2mBX8OzYX/DtZF/k75xf0O5YY5DuXGcY7qBqRO4QbQzvSG946ihtlOs0a4jnTGVc5zRjKOLMXPjgTFm03vxRvNl4T/zsbEP87ORD8O8gQ+TsmEuo7KBTPO4QVnzvFFlQ7mhfwOs4XdjpxF+o5pBZWOacVvzinFCk4eRM1N+oRLTahEAA8GwYAPGoG/jscCPo7TArtOxYN1TuzD6k7TRFjO3wSATsvE4U6RBP0OdISVzkNErU4IhEXODwQAzfTDvA1bQ0APHoAADyJAP47HQH7O3wC8Dv6BNo7gQixO80KbzuXDBA7ew2TOvEN/jnvDVk5ig2vOOkMCDgxDNU28Aq5NaMJADwAAAA8AQD/OxUA+ztZAPI7/QDdO98BtzscA3k7fAQdO9QFoDrVBgg6WgddOV4Hqjj3BvQ3SAasNnYFhjWfBA==",
				"format": 1030,
				"height": 16,
				"magFilter": 1006,
				"minFilter": 1006,
				"name": "DFG_LUT",
				"t": "dtex",
				"type": 1016,
				"width": 16,
				"wrapS": 1001,
				"wrapT": 1001
			},
			"k": "inputValue",
			"n": 2,
			"nodeClass": "texture",
			"uniformType": null
		},
		{
			"access": null,
			"group": "objectGroup",
			"json": {
				"arrayType": "Uint16Array",
				"data": "tTDROkwxTTrSMxw57zUoOPM3pjbRODk1eTkQNPg5UjJTOvAwlDrJL786NS7aOgUt6DofLO064CrqOtEp4Tr/KDg25DhKNs44mTZeOE43LDc5OKQ13DhiNG45xDLeOTQxKzoDMFk6Oi5tOuEsbjq6K186MypJOgopLTomKAo66CaUONc2lzjJNqM4dTa8OKw17jicND45MjOXOYYx4jk4MBM6dS4pOvUsLTqsKyE6/ykEOrwo3DmQJ605GiZ4OfokrDmoNKw5ozSuOYA0rjkjNLE5DjPCOakx4DljMPw5tS4MOh0tFDrPKwc6/ynpOaMovjk8J4k5syVKOYgkBzlFI3c6IzJ2Oh8yczoEMmo6szFYOhQxRTo7MDQ6ti4mOjEtHjrvKws6DSrsOaEowDkbJ4c5gCVEOUkk+ji9Iqw4VSEHO8ovBjvKLwA7uC/0Onwv2zrqLrQ6AC6FOuwsXjrFKzY6ACoNOpko3DkHJ6A5YiVaOSQkCzloIrc4/SBfONEfaTu5LGg7uyxiO7ssVjuuLDs7eCwNOwoszzrjKpI6mClUOmcoFzrQJtM5PCWJOQIkNTkmItw4vSB9OFQfHTizHak7aymoO28pozt7KZg7hyl/O3YpTjsnKQ47lSjCOrcnczo7JiM65yTQOZsjdjnZIRc5fiCyOOceSzhTHcc3HhzSO8sl0TvTJc078CXCOx8mrTtFJn07LSY+O8Ql7DoPJZM6OiQyOs4i0DlbIWk5KiD+OG4ejzjxHB84mxtiN90Z6TurIek7tyHlO+Uh3TtBIsk7pyKgO+wiYjvNIg87RyKuOnUhRDqIINQ5SR9gOb4d6Th3HHA46BrxN1MZCDcbGPY76hz2O/sc8zs4Hew7vR3aO3wetzslH307eR8sO0wfxjqmHlU6ux3aOb0cWjmdG9g4ABpVOKwYqzc8F7c2mBX8OzYX/DtZF/k75xf0O5YY5DuXGcY7qBqRO4QbQzvSG946ihtlOs0a4jnTGVc5zRjKOLMXPjgTFm03vxRvNl4T/zsbEP87ORD8O8gQ+TsmEuo7KBTPO4QVnzvFFlQ7mhfwOs4XdjpxF+o5pBZWOacVvzinFCk4eRM1N+oRLTahEAA8GwYAPGoG/jscCPo7TArtOxYN1TuzD6k7TRFjO3wSATsvE4U6RBP0OdISVzkNErU4IhEXODwQAzfTDvA1bQ0APHoAADyJAP47HQH7O3wC8Dv6BNo7gQixO80KbzuXDBA7ew2TOvEN/jnvDVk5ig2vOOkMCDgxDNU28Aq5NaMJADwAAAA8AQD/OxUA+ztZAPI7/QDdO98BtzscA3k7fAQdO9QFoDrVBgg6WgddOV4Hqjj3BvQ3SAasNnYFhjWfBA==",
				"format": 1030,
				"height": 16,
				"magFilter": 1006,
				"minFilter": 1006,
				"name": "DFG_LUT",
				"t": "dtex",
				"type": 1016,
				"width": 16,
				"wrapS": 1001,
				"wrapT": 1001
			},
			"k": "inputValue",
			"n": 3,
			"nodeClass": "texture",
			"uniformType": null
		},
		{
			"access": null,
			"group": "objectGroup",
			"json": {
				"arrayType": "Uint16Array",
				"data": "tTDROkwxTTrSMxw57zUoOPM3pjbRODk1eTkQNPg5UjJTOvAwlDrJL786NS7aOgUt6DofLO064CrqOtEp4Tr/KDg25DhKNs44mTZeOE43LDc5OKQ13DhiNG45xDLeOTQxKzoDMFk6Oi5tOuEsbjq6K186MypJOgopLTomKAo66CaUONc2lzjJNqM4dTa8OKw17jicND45MjOXOYYx4jk4MBM6dS4pOvUsLTqsKyE6/ykEOrwo3DmQJ605GiZ4OfokrDmoNKw5ozSuOYA0rjkjNLE5DjPCOakx4DljMPw5tS4MOh0tFDrPKwc6/ynpOaMovjk8J4k5syVKOYgkBzlFI3c6IzJ2Oh8yczoEMmo6szFYOhQxRTo7MDQ6ti4mOjEtHjrvKws6DSrsOaEowDkbJ4c5gCVEOUkk+ji9Iqw4VSEHO8ovBjvKLwA7uC/0Onwv2zrqLrQ6AC6FOuwsXjrFKzY6ACoNOpko3DkHJ6A5YiVaOSQkCzloIrc4/SBfONEfaTu5LGg7uyxiO7ssVjuuLDs7eCwNOwoszzrjKpI6mClUOmcoFzrQJtM5PCWJOQIkNTkmItw4vSB9OFQfHTizHak7aymoO28pozt7KZg7hyl/O3YpTjsnKQ47lSjCOrcnczo7JiM65yTQOZsjdjnZIRc5fiCyOOceSzhTHcc3HhzSO8sl0TvTJc078CXCOx8mrTtFJn07LSY+O8Ql7DoPJZM6OiQyOs4i0DlbIWk5KiD+OG4ejzjxHB84mxtiN90Z6TurIek7tyHlO+Uh3TtBIsk7pyKgO+wiYjvNIg87RyKuOnUhRDqIINQ5SR9gOb4d6Th3HHA46BrxN1MZCDcbGPY76hz2O/sc8zs4Hew7vR3aO3wetzslH307eR8sO0wfxjqmHlU6ux3aOb0cWjmdG9g4ABpVOKwYqzc8F7c2mBX8OzYX/DtZF/k75xf0O5YY5DuXGcY7qBqRO4QbQzvSG946ihtlOs0a4jnTGVc5zRjKOLMXPjgTFm03vxRvNl4T/zsbEP87ORD8O8gQ+TsmEuo7KBTPO4QVnzvFFlQ7mhfwOs4XdjpxF+o5pBZWOacVvzinFCk4eRM1N+oRLTahEAA8GwYAPGoG/jscCPo7TArtOxYN1TuzD6k7TRFjO3wSATsvE4U6RBP0OdISVzkNErU4IhEXODwQAzfTDvA1bQ0APHoAADyJAP47HQH7O3wC8Dv6BNo7gQixO80KbzuXDBA7ew2TOvEN/jnvDVk5ig2vOOkMCDgxDNU28Aq5NaMJADwAAAA8AQD/OxUA+ztZAPI7/QDdO98BtzscA3k7fAQdO9QFoDrVBgg6WgddOV4Hqjj3BvQ3SAasNnYFhjWfBA==",
				"format": 1030,
				"height": 16,
				"magFilter": 1006,
				"minFilter": 1006,
				"name": "DFG_LUT",
				"t": "dtex",
				"type": 1016,
				"width": 16,
				"wrapS": 1001,
				"wrapT": 1001
			},
			"k": "inputValue",
			"n": 4,
			"nodeClass": "texture",
			"uniformType": null
		},
		{
			"access": null,
			"group": "objectGroup",
			"json": {
				"arrayType": "Uint16Array",
				"data": "tTDROkwxTTrSMxw57zUoOPM3pjbRODk1eTkQNPg5UjJTOvAwlDrJL786NS7aOgUt6DofLO064CrqOtEp4Tr/KDg25DhKNs44mTZeOE43LDc5OKQ13DhiNG45xDLeOTQxKzoDMFk6Oi5tOuEsbjq6K186MypJOgopLTomKAo66CaUONc2lzjJNqM4dTa8OKw17jicND45MjOXOYYx4jk4MBM6dS4pOvUsLTqsKyE6/ykEOrwo3DmQJ605GiZ4OfokrDmoNKw5ozSuOYA0rjkjNLE5DjPCOakx4DljMPw5tS4MOh0tFDrPKwc6/ynpOaMovjk8J4k5syVKOYgkBzlFI3c6IzJ2Oh8yczoEMmo6szFYOhQxRTo7MDQ6ti4mOjEtHjrvKws6DSrsOaEowDkbJ4c5gCVEOUkk+ji9Iqw4VSEHO8ovBjvKLwA7uC/0Onwv2zrqLrQ6AC6FOuwsXjrFKzY6ACoNOpko3DkHJ6A5YiVaOSQkCzloIrc4/SBfONEfaTu5LGg7uyxiO7ssVjuuLDs7eCwNOwoszzrjKpI6mClUOmcoFzrQJtM5PCWJOQIkNTkmItw4vSB9OFQfHTizHak7aymoO28pozt7KZg7hyl/O3YpTjsnKQ47lSjCOrcnczo7JiM65yTQOZsjdjnZIRc5fiCyOOceSzhTHcc3HhzSO8sl0TvTJc078CXCOx8mrTtFJn07LSY+O8Ql7DoPJZM6OiQyOs4i0DlbIWk5KiD+OG4ejzjxHB84mxtiN90Z6TurIek7tyHlO+Uh3TtBIsk7pyKgO+wiYjvNIg87RyKuOnUhRDqIINQ5SR9gOb4d6Th3HHA46BrxN1MZCDcbGPY76hz2O/sc8zs4Hew7vR3aO3wetzslH307eR8sO0wfxjqmHlU6ux3aOb0cWjmdG9g4ABpVOKwYqzc8F7c2mBX8OzYX/DtZF/k75xf0O5YY5DuXGcY7qBqRO4QbQzvSG946ihtlOs0a4jnTGVc5zRjKOLMXPjgTFm03vxRvNl4T/zsbEP87ORD8O8gQ+TsmEuo7KBTPO4QVnzvFFlQ7mhfwOs4XdjpxF+o5pBZWOacVvzinFCk4eRM1N+oRLTahEAA8GwYAPGoG/jscCPo7TArtOxYN1TuzD6k7TRFjO3wSATsvE4U6RBP0OdISVzkNErU4IhEXODwQAzfTDvA1bQ0APHoAADyJAP47HQH7O3wC8Dv6BNo7gQixO80KbzuXDBA7ew2TOvEN/jnvDVk5ig2vOOkMCDgxDNU28Aq5NaMJADwAAAA8AQD/OxUA+ztZAPI7/QDdO98BtzscA3k7fAQdO9QFoDrVBgg6WgddOV4Hqjj3BvQ3SAasNnYFhjWfBA==",
				"format": 1030,
				"height": 16,
				"magFilter": 1006,
				"minFilter": 1006,
				"name": "DFG_LUT",
				"t": "dtex",
				"type": 1016,
				"width": 16,
				"wrapS": 1001,
				"wrapT": 1001
			},
			"k": "inputValue",
			"n": 5,
			"nodeClass": "texture",
			"uniformType": null
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"k": "inputNode",
				"nodeClass": "pmremTexture",
				"uniformType": null,
				"value": {
					"container": "@scene",
					"path": ["environment"]
				}
			},
			"path": ["_texture"]
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 2,
			"nodeClass": "texture",
			"uniformType": null,
			"value": {
				"container": "@scene",
				"path": ["environment"]
			}
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 3,
			"nodeClass": "texture",
			"uniformType": null,
			"value": {
				"container": "@scene",
				"path": ["environment"]
			}
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 4,
			"nodeClass": "texture",
			"uniformType": null,
			"value": {
				"container": "@scene",
				"path": ["environment"]
			}
		},
		{
			"access": null,
			"group": "objectGroup",
			"json": {
				"arrayType": "Uint16Array",
				"data": "tTDROkwxTTrSMxw57zUoOPM3pjbRODk1eTkQNPg5UjJTOvAwlDrJL786NS7aOgUt6DofLO064CrqOtEp4Tr/KDg25DhKNs44mTZeOE43LDc5OKQ13DhiNG45xDLeOTQxKzoDMFk6Oi5tOuEsbjq6K186MypJOgopLTomKAo66CaUONc2lzjJNqM4dTa8OKw17jicND45MjOXOYYx4jk4MBM6dS4pOvUsLTqsKyE6/ykEOrwo3DmQJ605GiZ4OfokrDmoNKw5ozSuOYA0rjkjNLE5DjPCOakx4DljMPw5tS4MOh0tFDrPKwc6/ynpOaMovjk8J4k5syVKOYgkBzlFI3c6IzJ2Oh8yczoEMmo6szFYOhQxRTo7MDQ6ti4mOjEtHjrvKws6DSrsOaEowDkbJ4c5gCVEOUkk+ji9Iqw4VSEHO8ovBjvKLwA7uC/0Onwv2zrqLrQ6AC6FOuwsXjrFKzY6ACoNOpko3DkHJ6A5YiVaOSQkCzloIrc4/SBfONEfaTu5LGg7uyxiO7ssVjuuLDs7eCwNOwoszzrjKpI6mClUOmcoFzrQJtM5PCWJOQIkNTkmItw4vSB9OFQfHTizHak7aymoO28pozt7KZg7hyl/O3YpTjsnKQ47lSjCOrcnczo7JiM65yTQOZsjdjnZIRc5fiCyOOceSzhTHcc3HhzSO8sl0TvTJc078CXCOx8mrTtFJn07LSY+O8Ql7DoPJZM6OiQyOs4i0DlbIWk5KiD+OG4ejzjxHB84mxtiN90Z6TurIek7tyHlO+Uh3TtBIsk7pyKgO+wiYjvNIg87RyKuOnUhRDqIINQ5SR9gOb4d6Th3HHA46BrxN1MZCDcbGPY76hz2O/sc8zs4Hew7vR3aO3wetzslH307eR8sO0wfxjqmHlU6ux3aOb0cWjmdG9g4ABpVOKwYqzc8F7c2mBX8OzYX/DtZF/k75xf0O5YY5DuXGcY7qBqRO4QbQzvSG946ihtlOs0a4jnTGVc5zRjKOLMXPjgTFm03vxRvNl4T/zsbEP87ORD8O8gQ+TsmEuo7KBTPO4QVnzvFFlQ7mhfwOs4XdjpxF+o5pBZWOacVvzinFCk4eRM1N+oRLTahEAA8GwYAPGoG/jscCPo7TArtOxYN1TuzD6k7TRFjO3wSATsvE4U6RBP0OdISVzkNErU4IhEXODwQAzfTDvA1bQ0APHoAADyJAP47HQH7O3wC8Dv6BNo7gQixO80KbzuXDBA7ew2TOvEN/jnvDVk5ig2vOOkMCDgxDNU28Aq5NaMJADwAAAA8AQD/OxUA+ztZAPI7/QDdO98BtzscA3k7fAQdO9QFoDrVBgg6WgddOV4Hqjj3BvQ3SAasNnYFhjWfBA==",
				"format": 1030,
				"height": 16,
				"magFilter": 1006,
				"minFilter": 1006,
				"name": "DFG_LUT",
				"t": "dtex",
				"type": 1016,
				"width": 16,
				"wrapS": 1001,
				"wrapT": 1001
			},
			"k": "inputValue",
			"n": 6,
			"nodeClass": "texture",
			"uniformType": null
		},
		{
			"access": null,
			"group": "objectGroup",
			"json": {
				"arrayType": "Uint16Array",
				"data": "tTDROkwxTTrSMxw57zUoOPM3pjbRODk1eTkQNPg5UjJTOvAwlDrJL786NS7aOgUt6DofLO064CrqOtEp4Tr/KDg25DhKNs44mTZeOE43LDc5OKQ13DhiNG45xDLeOTQxKzoDMFk6Oi5tOuEsbjq6K186MypJOgopLTomKAo66CaUONc2lzjJNqM4dTa8OKw17jicND45MjOXOYYx4jk4MBM6dS4pOvUsLTqsKyE6/ykEOrwo3DmQJ605GiZ4OfokrDmoNKw5ozSuOYA0rjkjNLE5DjPCOakx4DljMPw5tS4MOh0tFDrPKwc6/ynpOaMovjk8J4k5syVKOYgkBzlFI3c6IzJ2Oh8yczoEMmo6szFYOhQxRTo7MDQ6ti4mOjEtHjrvKws6DSrsOaEowDkbJ4c5gCVEOUkk+ji9Iqw4VSEHO8ovBjvKLwA7uC/0Onwv2zrqLrQ6AC6FOuwsXjrFKzY6ACoNOpko3DkHJ6A5YiVaOSQkCzloIrc4/SBfONEfaTu5LGg7uyxiO7ssVjuuLDs7eCwNOwoszzrjKpI6mClUOmcoFzrQJtM5PCWJOQIkNTkmItw4vSB9OFQfHTizHak7aymoO28pozt7KZg7hyl/O3YpTjsnKQ47lSjCOrcnczo7JiM65yTQOZsjdjnZIRc5fiCyOOceSzhTHcc3HhzSO8sl0TvTJc078CXCOx8mrTtFJn07LSY+O8Ql7DoPJZM6OiQyOs4i0DlbIWk5KiD+OG4ejzjxHB84mxtiN90Z6TurIek7tyHlO+Uh3TtBIsk7pyKgO+wiYjvNIg87RyKuOnUhRDqIINQ5SR9gOb4d6Th3HHA46BrxN1MZCDcbGPY76hz2O/sc8zs4Hew7vR3aO3wetzslH307eR8sO0wfxjqmHlU6ux3aOb0cWjmdG9g4ABpVOKwYqzc8F7c2mBX8OzYX/DtZF/k75xf0O5YY5DuXGcY7qBqRO4QbQzvSG946ihtlOs0a4jnTGVc5zRjKOLMXPjgTFm03vxRvNl4T/zsbEP87ORD8O8gQ+TsmEuo7KBTPO4QVnzvFFlQ7mhfwOs4XdjpxF+o5pBZWOacVvzinFCk4eRM1N+oRLTahEAA8GwYAPGoG/jscCPo7TArtOxYN1TuzD6k7TRFjO3wSATsvE4U6RBP0OdISVzkNErU4IhEXODwQAzfTDvA1bQ0APHoAADyJAP47HQH7O3wC8Dv6BNo7gQixO80KbzuXDBA7ew2TOvEN/jnvDVk5ig2vOOkMCDgxDNU28Aq5NaMJADwAAAA8AQD/OxUA+ztZAPI7/QDdO98BtzscA3k7fAQdO9QFoDrVBgg6WgddOV4Hqjj3BvQ3SAasNnYFhjWfBA==",
				"format": 1030,
				"height": 16,
				"magFilter": 1006,
				"minFilter": 1006,
				"name": "DFG_LUT",
				"t": "dtex",
				"type": 1016,
				"width": 16,
				"wrapS": 1001,
				"wrapT": 1001
			},
			"k": "inputValue",
			"n": 7,
			"nodeClass": "texture",
			"uniformType": null
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 5,
			"nodeClass": "texture",
			"uniformType": null,
			"value": {
				"container": "@scene",
				"path": ["environment"]
			}
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 6,
			"nodeClass": "texture",
			"uniformType": null,
			"value": {
				"container": "@scene",
				"path": ["environment"]
			}
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 7,
			"nodeClass": "texture",
			"uniformType": null,
			"value": {
				"container": "@scene",
				"path": ["environment"]
			}
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 8,
			"nodeClass": "texture",
			"uniformType": null,
			"value": {
				"container": "@scene",
				"path": ["environment"]
			}
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 9,
			"nodeClass": "texture",
			"uniformType": null,
			"value": {
				"container": "@scene",
				"path": ["environment"]
			}
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 10,
			"nodeClass": "texture",
			"uniformType": null,
			"value": {
				"container": "@scene",
				"path": ["environment"]
			}
		},
		{
			"access": null,
			"k": "inputNode",
			"nodeClass": "pmremTexture",
			"uniformType": null,
			"value": {
				"container": "@scene",
				"path": ["environment"]
			}
		},
		{
			"k": "owned",
			"owner": {
				"k": "anchor",
				"key": "text/fluid-output",
				"path": [],
				"slot": "fragmentNode"
			},
			"path": [0,0]
		},
		{
			"k": "owned",
			"owner": {
				"k": "anchor",
				"key": "text/fluid-output",
				"path": [],
				"slot": "fragmentNode"
			},
			"path": [0,0,1,0,1,0,0,0]
		},
		{
			"k": "container",
			"key": "text/fluid",
			"path": ["fluid","_textureNode","_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"k": "owned",
				"owner": {
					"k": "anchor",
					"key": "text/fluid-output",
					"path": [],
					"slot": "fragmentNode"
				},
				"path": [0,0]
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"k": "anchor",
				"key": "text/fluid-output",
				"path": [],
				"slot": "fragmentNode"
			},
			"path": [0,0,2]
		},
		{
			"k": "owned",
			"owner": {
				"k": "anchor",
				"key": "text/fluid-output",
				"path": [],
				"slot": "fragmentNode"
			},
			"path": [0,0,3]
		},
		{
			"k": "owned",
			"owner": {
				"k": "anchor",
				"key": "text/fluid-output",
				"path": [],
				"slot": "fragmentNode"
			},
			"path": [0,0,1,0,1,0,0,0,1]
		},
		{
			"fn": "lightShadowMatrix",
			"k": "lightUniform",
			"light": 0
		},
		{
			"k": "owned",
			"owner": {
				"group": "renderGroup",
				"k": "reference",
				"object": {
					"container": "text/key-light",
					"path": ["shadow"]
				},
				"property": "normalBias",
				"uniformType": "float"
			},
			"path": ["node"],
			"prime": "reference"
		},
		{
			"k": "owned",
			"owner": {
				"group": "renderGroup",
				"k": "reference",
				"object": {
					"container": "text/key-light",
					"path": ["shadow"]
				},
				"property": "bias",
				"uniformType": "float"
			},
			"path": ["node"],
			"prime": "reference"
		},
		{
			"k": "owned",
			"owner": {
				"group": "renderGroup",
				"k": "reference",
				"object": {
					"container": "text/key-light",
					"path": ["shadow"]
				},
				"property": "mapSize",
				"uniformType": "vec2"
			},
			"path": ["node"],
			"prime": "reference"
		},
		{
			"access": null,
			"comparison": true,
			"group": "objectGroup",
			"k": "inputNode",
			"nodeClass": "texture",
			"uniformType": null,
			"value": {
				"container": "text/key-light",
				"path": ["shadow","map","_depthTexture"]
			}
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"comparison": true,
				"group": "objectGroup",
				"k": "inputNode",
				"nodeClass": "texture",
				"uniformType": null,
				"value": {
					"container": "text/key-light",
					"path": ["shadow","map","_depthTexture"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"comparison": true,
				"group": "objectGroup",
				"k": "inputNode",
				"n": 1,
				"nodeClass": "texture",
				"uniformType": null,
				"value": {
					"container": "text/key-light",
					"path": ["shadow","map","_depthTexture"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"comparison": true,
				"group": "objectGroup",
				"k": "inputNode",
				"n": 2,
				"nodeClass": "texture",
				"uniformType": null,
				"value": {
					"container": "text/key-light",
					"path": ["shadow","map","_depthTexture"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"access": null,
				"comparison": true,
				"group": "objectGroup",
				"k": "inputNode",
				"n": 3,
				"nodeClass": "texture",
				"uniformType": null,
				"value": {
					"container": "text/key-light",
					"path": ["shadow","map","_depthTexture"]
				}
			},
			"path": ["_flipYUniform"]
		},
		{
			"k": "owned",
			"owner": {
				"group": "renderGroup",
				"k": "reference",
				"object": {
					"container": "text/key-light",
					"path": ["shadow"]
				},
				"property": "intensity",
				"uniformType": "float"
			},
			"path": ["node"],
			"prime": "reference"
		},
		{
			"group": "renderGroup",
			"k": "reference",
			"object": {
				"container": "text/key-light",
				"path": ["shadow"]
			},
			"property": "normalBias",
			"uniformType": "float"
		},
		{
			"group": "renderGroup",
			"k": "reference",
			"object": {
				"container": "text/key-light",
				"path": ["shadow"]
			},
			"property": "bias",
			"uniformType": "float"
		},
		{
			"group": "renderGroup",
			"k": "reference",
			"object": {
				"container": "text/key-light",
				"path": ["shadow"]
			},
			"property": "mapSize",
			"uniformType": "vec2"
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"nodeClass": "texture",
			"uniformType": null,
			"value": {
				"container": "text/key-light",
				"path": ["shadow","map","_depthTexture"]
			}
		},
		{
			"access": null,
			"comparison": true,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 1,
			"nodeClass": "texture",
			"uniformType": null,
			"value": {
				"container": "text/key-light",
				"path": ["shadow","map","_depthTexture"]
			}
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 1,
			"nodeClass": "texture",
			"uniformType": null,
			"value": {
				"container": "text/key-light",
				"path": ["shadow","map","_depthTexture"]
			}
		},
		{
			"access": null,
			"comparison": true,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 2,
			"nodeClass": "texture",
			"uniformType": null,
			"value": {
				"container": "text/key-light",
				"path": ["shadow","map","_depthTexture"]
			}
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 2,
			"nodeClass": "texture",
			"uniformType": null,
			"value": {
				"container": "text/key-light",
				"path": ["shadow","map","_depthTexture"]
			}
		},
		{
			"access": null,
			"comparison": true,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 3,
			"nodeClass": "texture",
			"uniformType": null,
			"value": {
				"container": "text/key-light",
				"path": ["shadow","map","_depthTexture"]
			}
		},
		{
			"access": null,
			"group": "objectGroup",
			"k": "inputNode",
			"n": 3,
			"nodeClass": "texture",
			"uniformType": null,
			"value": {
				"container": "text/key-light",
				"path": ["shadow","map","_depthTexture"]
			}
		},
		{
			"group": "renderGroup",
			"k": "reference",
			"object": {
				"container": "text/key-light",
				"path": ["shadow"]
			},
			"property": "intensity",
			"uniformType": "float"
		},
		{
			"k": "owned",
			"owner": {
				"k": "lightNode",
				"light": 0
			},
			"path": [2]
		}
	],
	"requirementPlans": [],
	"requiresSetup": false,
	"runtime": {
		"address": 2,
		"hydration": 2,
		"id": "three-webgl-r185-v1",
		"recipe": 1
	},
	"scene": "text",
	"states": [
		{
			"attributes": 0,
			"compute": null,
			"declarations": [
				[0,0,"texture","fragment","nodeUniform0"],
				[1,0,"uint","fragment","nodeUniform1"],
				[2,0,"mat4","vertex","cameraProjectionMatrix"],
				[3,0,"mat4","vertex","cameraViewMatrix"],
				[4,0,"mat4","vertex","nodeUniform4"]
			],
			"fragment": 1,
			"hardwareClipping": false,
			"layout": 0,
			"observer": {
				"hasAnimation": false,
				"hasNode": true
			},
			"updates": [0,1,1],
			"vertex": 0
		},
		{
			"attributes": 0,
			"compute": null,
			"declarations": [
				[8,0,"float","fragment","nodeUniform0"],
				[9,0,"float","fragment","nodeUniform1"],
				[10,0,"texture","fragment","nodeUniform2"],
				[11,0,"uint","fragment","nodeUniform3"],
				[12,0,"uint","fragment","nodeUniform4"],
				[2,0,"mat4","vertex","cameraProjectionMatrix"],
				[3,0,"mat4","vertex","cameraViewMatrix"],
				[4,0,"mat4","vertex","nodeUniform7"]
			],
			"fragment": 3,
			"hardwareClipping": false,
			"layout": 1,
			"observer": {
				"hasAnimation": false,
				"hasNode": true
			},
			"updates": [2,1,1],
			"vertex": 2
		},
		{
			"attributes": 1,
			"compute": null,
			"declarations": [
				[15,0,"float","fragment","nodeUniform0"],
				[2,0,"mat4","vertex","cameraProjectionMatrix"],
				[3,0,"mat4","vertex","cameraViewMatrix"],
				[4,0,"mat4","vertex","nodeUniform3"]
			],
			"fragment": 5,
			"hardwareClipping": false,
			"layout": 2,
			"observer": {
				"hasAnimation": false,
				"hasNode": true
			},
			"updates": [3,1,1],
			"vertex": 4
		},
		{
			"attributes": 2,
			"compute": null,
			"declarations": [
				[17,0,"texture","fragment","nodeUniform0"],
				[18,0,"mat3","fragment","nodeUniform1"],
				[19,0,"uint","fragment","nodeUniform2"],
				[20,0,"float","fragment","nodeUniform3"],
				[2,0,"mat4","vertex","cameraProjectionMatrix"],
				[3,0,"mat4","vertex","cameraViewMatrix"],
				[4,0,"mat4","vertex","nodeUniform6"]
			],
			"fragment": 7,
			"hardwareClipping": false,
			"layout": 3,
			"observer": {
				"hasAnimation": false,
				"hasNode": true
			},
			"updates": [4,1,1],
			"vertex": 6
		},
		{
			"attributes": 2,
			"compute": null,
			"declarations": [
				[22,0,"vec2","fragment","nodeUniform0"],
				[23,0,"float","fragment","nodeUniform1"],
				[24,0,"texture","fragment","nodeUniform2"],
				[25,0,"mat3","fragment","nodeUniform3"],
				[26,0,"uint","fragment","nodeUniform4"],
				[25,1,"mat3","fragment","nodeUniform5"],
				[27,0,"uint","fragment","nodeUniform6"],
				[25,2,"mat3","fragment","nodeUniform7"],
				[28,0,"uint","fragment","nodeUniform8"],
				[25,3,"mat3","fragment","nodeUniform9"],
				[29,0,"uint","fragment","nodeUniform10"],
				[2,0,"mat4","vertex","cameraProjectionMatrix"],
				[3,0,"mat4","vertex","cameraViewMatrix"],
				[4,0,"mat4","vertex","nodeUniform13"]
			],
			"fragment": 9,
			"hardwareClipping": false,
			"layout": 4,
			"observer": {
				"hasAnimation": false,
				"hasNode": true
			},
			"updates": [5,1,1],
			"vertex": 8
		},
		{
			"attributes": 2,
			"compute": null,
			"declarations": [
				[34,0,"float","fragment","nodeUniform0"],
				[17,0,"texture","fragment","nodeUniform1"],
				[18,0,"mat3","fragment","nodeUniform2"],
				[22,0,"vec2","fragment","nodeUniform3"],
				[23,0,"float","fragment","nodeUniform4"],
				[19,0,"uint","fragment","nodeUniform5"],
				[18,1,"mat3","fragment","nodeUniform6"],
				[35,0,"uint","fragment","nodeUniform7"],
				[18,2,"mat3","fragment","nodeUniform8"],
				[36,0,"uint","fragment","nodeUniform9"],
				[18,3,"mat3","fragment","nodeUniform10"],
				[37,0,"uint","fragment","nodeUniform11"],
				[38,0,"texture","fragment","nodeUniform12"],
				[39,0,"mat3","fragment","nodeUniform13"],
				[40,0,"uint","fragment","nodeUniform14"],
				[2,0,"mat4","vertex","cameraProjectionMatrix"],
				[3,0,"mat4","vertex","cameraViewMatrix"],
				[4,0,"mat4","vertex","nodeUniform17"]
			],
			"fragment": 11,
			"hardwareClipping": false,
			"layout": 5,
			"observer": {
				"hasAnimation": false,
				"hasNode": true
			},
			"updates": [6,1,1],
			"vertex": 10
		},
		{
			"attributes": 2,
			"compute": null,
			"declarations": [
				[45,0,"texture","fragment","nodeUniform0"],
				[46,0,"mat3","fragment","nodeUniform1"],
				[22,0,"vec2","fragment","nodeUniform2"],
				[23,0,"float","fragment","nodeUniform3"],
				[47,0,"uint","fragment","nodeUniform4"],
				[46,1,"mat3","fragment","nodeUniform5"],
				[48,0,"uint","fragment","nodeUniform6"],
				[46,2,"mat3","fragment","nodeUniform7"],
				[49,0,"uint","fragment","nodeUniform8"],
				[46,3,"mat3","fragment","nodeUniform9"],
				[50,0,"uint","fragment","nodeUniform10"],
				[51,0,"float","fragment","nodeUniform11"],
				[46,4,"mat3","fragment","nodeUniform12"],
				[52,0,"uint","fragment","nodeUniform13"],
				[24,0,"texture","fragment","nodeUniform14"],
				[53,0,"mat3","fragment","nodeUniform15"],
				[26,0,"uint","fragment","nodeUniform16"],
				[54,0,"float","fragment","nodeUniform17"],
				[2,0,"mat4","vertex","cameraProjectionMatrix"],
				[3,0,"mat4","vertex","cameraViewMatrix"],
				[4,0,"mat4","vertex","nodeUniform20"]
			],
			"fragment": 13,
			"hardwareClipping": false,
			"layout": 6,
			"observer": {
				"hasAnimation": false,
				"hasNode": true
			},
			"updates": [7,1,1],
			"vertex": 12
		},
		{
			"attributes": 2,
			"compute": null,
			"declarations": [
				[60,0,"texture","fragment","nodeUniform0"],
				[61,0,"mat3","fragment","nodeUniform1"],
				[54,0,"float","fragment","nodeUniform2"],
				[24,0,"texture","fragment","nodeUniform3"],
				[25,0,"mat3","fragment","nodeUniform4"],
				[26,0,"uint","fragment","nodeUniform5"],
				[22,0,"vec2","fragment","nodeUniform6"],
				[62,0,"uint","fragment","nodeUniform7"],
				[63,0,"float","fragment","nodeUniform8"],
				[2,0,"mat4","vertex","cameraProjectionMatrix"],
				[3,0,"mat4","vertex","cameraViewMatrix"],
				[4,0,"mat4","vertex","nodeUniform11"]
			],
			"fragment": 15,
			"hardwareClipping": false,
			"layout": 7,
			"observer": {
				"hasAnimation": false,
				"hasNode": true
			},
			"updates": [8,1,1],
			"vertex": 14
		},
		{
			"attributes": 2,
			"compute": null,
			"declarations": [
				[24,0,"texture","fragment","nodeUniform0"],
				[53,0,"mat3","fragment","nodeUniform1"],
				[22,0,"vec2","fragment","nodeUniform2"],
				[23,0,"float","fragment","nodeUniform3"],
				[26,0,"uint","fragment","nodeUniform4"],
				[53,1,"mat3","fragment","nodeUniform5"],
				[27,0,"uint","fragment","nodeUniform6"],
				[53,2,"mat3","fragment","nodeUniform7"],
				[28,0,"uint","fragment","nodeUniform8"],
				[53,3,"mat3","fragment","nodeUniform9"],
				[29,0,"uint","fragment","nodeUniform10"],
				[2,0,"mat4","vertex","cameraProjectionMatrix"],
				[3,0,"mat4","vertex","cameraViewMatrix"],
				[4,0,"mat4","vertex","nodeUniform13"]
			],
			"fragment": 17,
			"hardwareClipping": false,
			"layout": 8,
			"observer": {
				"hasAnimation": false,
				"hasNode": true
			},
			"updates": [5,1,1],
			"vertex": 16
		},
		{
			"attributes": 2,
			"compute": null,
			"declarations": [
				[24,0,"texture","fragment","nodeUniform0"],
				[53,0,"mat3","fragment","nodeUniform1"],
				[54,0,"float","fragment","nodeUniform2"],
				[53,1,"mat3","fragment","nodeUniform3"],
				[27,0,"uint","fragment","nodeUniform4"],
				[22,0,"vec2","fragment","nodeUniform5"],
				[26,0,"uint","fragment","nodeUniform6"],
				[63,0,"float","fragment","nodeUniform7"],
				[2,0,"mat4","vertex","cameraProjectionMatrix"],
				[3,0,"mat4","vertex","cameraViewMatrix"],
				[4,0,"mat4","vertex","nodeUniform10"]
			],
			"fragment": 19,
			"hardwareClipping": false,
			"layout": 9,
			"observer": {
				"hasAnimation": false,
				"hasNode": true
			},
			"updates": [9,1,1],
			"vertex": 18
		},
		{
			"attributes": 2,
			"compute": null,
			"declarations": [
				[24,0,"texture","fragment","nodeUniform0"],
				[25,0,"mat3","fragment","nodeUniform1"],
				[26,0,"uint","fragment","nodeUniform2"],
				[17,0,"texture","fragment","nodeUniform3"],
				[65,0,"mat3","fragment","nodeUniform4"],
				[22,0,"vec2","fragment","nodeUniform5"],
				[23,0,"float","fragment","nodeUniform6"],
				[19,0,"uint","fragment","nodeUniform7"],
				[65,1,"mat3","fragment","nodeUniform8"],
				[35,0,"uint","fragment","nodeUniform9"],
				[65,2,"mat3","fragment","nodeUniform10"],
				[36,0,"uint","fragment","nodeUniform11"],
				[65,3,"mat3","fragment","nodeUniform12"],
				[37,0,"uint","fragment","nodeUniform13"],
				[2,0,"mat4","vertex","cameraProjectionMatrix"],
				[3,0,"mat4","vertex","cameraViewMatrix"],
				[4,0,"mat4","vertex","nodeUniform16"]
			],
			"fragment": 21,
			"hardwareClipping": false,
			"layout": 10,
			"observer": {
				"hasAnimation": false,
				"hasNode": true
			},
			"updates": [10,1,1],
			"vertex": 20
		},
		{
			"attributes": 3,
			"compute": null,
			"declarations": [
				[66,0,"color","fragment","nodeUniform0"],
				[15,0,"float","fragment","nodeUniform1"],
				[67,0,"float","fragment","nodeUniform2"],
				[68,0,"float","fragment","nodeUniform3"],
				[3,0,"mat4","vertex","cameraViewMatrix"],
				[69,0,"mat3","vertex","nodeUniform5"],
				[70,0,"color","fragment","nodeUniform6"],
				[71,0,"float","fragment","nodeUniform7"],
				[3,0,"mat4","fragment","cameraViewMatrix"],
				[72,0,"vec3","fragment","nodeUniform9"],
				[73,0,"vec3","fragment","nodeUniform10"],
				[74,0,"color","fragment","nodeUniform11"],
				[4,0,"mat4","vertex","nodeUniform12"],
				[75,0,"texture","fragment","nodeUniform13"],
				[76,0,"uint","fragment","nodeUniform14"],
				[77,0,"uint","fragment","nodeUniform15"],
				[78,0,"vec3","fragment","nodeUniform16"],
				[79,0,"vec3","fragment","nodeUniform17"],
				[80,0,"color","fragment","nodeUniform18"],
				[81,0,"uint","fragment","nodeUniform19"],
				[82,0,"uint","fragment","nodeUniform20"],
				[83,0,"vec3","fragment","nodeUniform21"],
				[84,0,"vec3","fragment","nodeUniform22"],
				[85,0,"color","fragment","nodeUniform23"],
				[86,0,"uint","fragment","nodeUniform24"],
				[87,0,"uint","fragment","nodeUniform25"],
				[88,0,"color","fragment","nodeUniform26"],
				[89,0,"float","fragment","nodeUniform27"],
				[90,0,"mat4","fragment","nodeUniform28"],
				[91,0,"mat4","fragment","cameraWorldMatrix"],
				[92,0,"float","fragment","nodeUniform30"],
				[93,0,"float","fragment","nodeUniform31"],
				[94,0,"texture","fragment","nodeUniform32"],
				[95,0,"uint","fragment","nodeUniform33"],
				[96,0,"uint","fragment","nodeUniform34"],
				[97,0,"float","fragment","nodeUniform35"],
				[98,0,"uint","fragment","nodeUniform36"],
				[99,0,"uint","fragment","nodeUniform37"],
				[100,0,"uint","fragment","nodeUniform38"],
				[101,0,"uint","fragment","nodeUniform39"],
				[2,0,"mat4","vertex","cameraProjectionMatrix"]
			],
			"fragment": 23,
			"hardwareClipping": false,
			"layout": 11,
			"observer": {
				"hasAnimation": false,
				"hasNode": false
			},
			"updates": [11,12,1],
			"vertex": 22
		},
		{
			"attributes": 2,
			"compute": null,
			"declarations": [
				[129,0,"texture","fragment","nodeUniform0"],
				[130,0,"texture","fragment","nodeUniform1"],
				[131,0,"uint","fragment","nodeUniform2"],
				[132,0,"uint","fragment","nodeUniform3"],
				[2,0,"mat4","vertex","cameraProjectionMatrix"],
				[3,0,"mat4","vertex","cameraViewMatrix"],
				[4,0,"mat4","vertex","nodeUniform6"]
			],
			"fragment": 25,
			"hardwareClipping": false,
			"layout": 12,
			"observer": {
				"hasAnimation": false,
				"hasNode": true
			},
			"updates": [13,14,1],
			"vertex": 24
		},
		{
			"attributes": 3,
			"compute": null,
			"declarations": [
				[66,0,"color","fragment","nodeUniform0"],
				[15,0,"float","fragment","nodeUniform1"],
				[67,0,"float","fragment","nodeUniform2"],
				[68,0,"float","fragment","nodeUniform3"],
				[3,0,"mat4","vertex","cameraViewMatrix"],
				[69,0,"mat3","vertex","nodeUniform5"],
				[70,0,"color","fragment","nodeUniform6"],
				[71,0,"float","fragment","nodeUniform7"],
				[3,0,"mat4","fragment","cameraViewMatrix"],
				[72,0,"vec3","fragment","nodeUniform9"],
				[73,0,"vec3","fragment","nodeUniform10"],
				[74,0,"color","fragment","nodeUniform11"],
				[4,0,"mat4","vertex","nodeUniform12"],
				[136,0,"mat4","fragment","nodeUniform13"],
				[137,0,"float","fragment","nodeUniform14"],
				[138,0,"float","fragment","nodeUniform15"],
				[139,0,"vec2","fragment","nodeUniform16"],
				[140,0,"texture","fragment","nodeUniform17"],
				[141,0,"uint","fragment","nodeUniform18"],
				[142,0,"uint","fragment","nodeUniform19"],
				[143,0,"uint","fragment","nodeUniform20"],
				[144,0,"uint","fragment","nodeUniform21"],
				[145,0,"float","fragment","nodeUniform22"],
				[75,0,"texture","fragment","nodeUniform23"],
				[76,0,"uint","fragment","nodeUniform24"],
				[77,0,"uint","fragment","nodeUniform25"],
				[78,0,"vec3","fragment","nodeUniform26"],
				[79,0,"vec3","fragment","nodeUniform27"],
				[80,0,"color","fragment","nodeUniform28"],
				[81,0,"uint","fragment","nodeUniform29"],
				[82,0,"uint","fragment","nodeUniform30"],
				[83,0,"vec3","fragment","nodeUniform31"],
				[84,0,"vec3","fragment","nodeUniform32"],
				[85,0,"color","fragment","nodeUniform33"],
				[86,0,"uint","fragment","nodeUniform34"],
				[87,0,"uint","fragment","nodeUniform35"],
				[88,0,"color","fragment","nodeUniform36"],
				[89,0,"float","fragment","nodeUniform37"],
				[90,0,"mat4","fragment","nodeUniform38"],
				[91,0,"mat4","fragment","cameraWorldMatrix"],
				[92,0,"float","fragment","nodeUniform40"],
				[93,0,"float","fragment","nodeUniform41"],
				[94,0,"texture","fragment","nodeUniform42"],
				[95,0,"uint","fragment","nodeUniform43"],
				[96,0,"uint","fragment","nodeUniform44"],
				[97,0,"float","fragment","nodeUniform45"],
				[98,0,"uint","fragment","nodeUniform46"],
				[99,0,"uint","fragment","nodeUniform47"],
				[100,0,"uint","fragment","nodeUniform48"],
				[101,0,"uint","fragment","nodeUniform49"],
				[2,0,"mat4","vertex","cameraProjectionMatrix"]
			],
			"fragment": 27,
			"hardwareClipping": false,
			"layout": 13,
			"observer": {
				"hasAnimation": false,
				"hasNode": false
			},
			"updates": [15,16,1],
			"vertex": 26
		}
	],
	"three": "0.185.1",
	"threeBlocks": "0.6.0",
	"updatePlans": [
		[2,5,3,6,7,0],
		[],
		[2,5,3,6,7,10,13,14],
		[2,5,3,6,7,16],
		[2,5,3,6,7,17,21],
		[2,5,3,6,7,24,30,31,32,33],
		[2,5,3,6,7,17,21,41,42,43,38,44],
		[2,5,3,6,7,45,55,56,57,58,59,24,30],
		[2,5,3,6,7,60,64,24,30],
		[2,5,3,6,7,24,30,31],
		[2,5,3,6,7,24,30,17,21,41,42,43],
		[2,5,3,6,7,102,16,103,104,69,105,106,107,108,109,110,72,73,75,111,78,79,112,113,83,84,114,115,90,91,94,116,117,97,118,119,120,121,122,123,124,125,126,127],
		[128],
		[2,5,3,6,7,129,133,130],
		[134,135],
		[2,5,3,6,7,102,16,103,104,69,105,106,107,108,109,110,72,73,136,146,147,148,140,149,150,151,152,153,154,155,156,75,111,78,79,112,113,83,84,114,115,90,91,94,116,117,97,118,119,120,121,122,123,124,125,126,127],
		[157,128]
	],
	"version": 3
} satisfies PrecompiledManifest;
