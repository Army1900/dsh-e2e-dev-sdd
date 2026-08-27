window.__ModuleLoader__.load({
	id: "dsh-e2e-dev-sdd",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region node_modules/.pnpm/dompurify@3.4.14/node_modules/dompurify/dist/purify.es.mjs
		/*! @license DOMPurify 3.4.14 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.4.14/LICENSE */
		function _arrayLikeToArray(r, a) {
			(null == a || a > r.length) && (a = r.length);
			for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
			return n;
		}
		function _arrayWithHoles(r) {
			if (Array.isArray(r)) return r;
		}
		function _iterableToArrayLimit(r, l) {
			var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
			if (null != t) {
				var e, n, i, u, a = [], f = true, o = false;
				try {
					if (i = (t = t.call(r)).next, 0 === l);
					else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0);
				} catch (r) {
					o = true, n = r;
				} finally {
					try {
						if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return;
					} finally {
						if (o) throw n;
					}
				}
				return a;
			}
		}
		function _nonIterableRest() {
			throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
		}
		function _slicedToArray(r, e) {
			return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest();
		}
		function _unsupportedIterableToArray(r, a) {
			if (r) {
				if ("string" == typeof r) return _arrayLikeToArray(r, a);
				var t = {}.toString.call(r).slice(8, -1);
				return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
			}
		}
		const entries = Object.entries;
		const setPrototypeOf = Object.setPrototypeOf;
		const isFrozen = Object.isFrozen;
		const getPrototypeOf = Object.getPrototypeOf;
		const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
		let freeze = Object.freeze;
		let seal = Object.seal;
		let create = Object.create;
		let _ref = typeof Reflect !== "undefined" && Reflect;
		let apply$1 = _ref.apply;
		let construct = _ref.construct;
		if (!freeze) freeze = function freeze(x) {
			return x;
		};
		if (!seal) seal = function seal(x) {
			return x;
		};
		if (!apply$1) apply$1 = function apply(func, thisArg) {
			for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) args[_key - 2] = arguments[_key];
			return func.apply(thisArg, args);
		};
		if (!construct) construct = function construct(Func) {
			for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) args[_key2 - 1] = arguments[_key2];
			return new Func(...args);
		};
		const arrayForEach = unapply(Array.prototype.forEach);
		const arrayLastIndexOf = unapply(Array.prototype.lastIndexOf);
		const arrayPop = unapply(Array.prototype.pop);
		const arrayPush = unapply(Array.prototype.push);
		const arraySplice = unapply(Array.prototype.splice);
		const arrayIsArray = Array.isArray;
		const stringToLowerCase = unapply(String.prototype.toLowerCase);
		const stringToString = unapply(String.prototype.toString);
		const stringMatch = unapply(String.prototype.match);
		const stringReplace = unapply(String.prototype.replace);
		const stringIndexOf = unapply(String.prototype.indexOf);
		const stringTrim = unapply(String.prototype.trim);
		const numberToString = unapply(Number.prototype.toString);
		const booleanToString = unapply(Boolean.prototype.toString);
		const bigintToString = typeof BigInt === "undefined" ? null : unapply(BigInt.prototype.toString);
		const symbolToString = typeof Symbol === "undefined" ? null : unapply(Symbol.prototype.toString);
		const objectHasOwnProperty = unapply(Object.prototype.hasOwnProperty);
		const objectToString = unapply(Object.prototype.toString);
		const regExpTest = unapply(RegExp.prototype.test);
		const typeErrorCreate = unconstruct(TypeError);
		/**
		* Creates a new function that calls the given function with a specified thisArg and arguments.
		*
		* @param func - The function to be wrapped and called.
		* @returns A new function that calls the given function with a specified thisArg and arguments.
		*/
		function unapply(func) {
			return function(thisArg) {
				if (thisArg instanceof RegExp) thisArg.lastIndex = 0;
				for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) args[_key3 - 1] = arguments[_key3];
				return apply$1(func, thisArg, args);
			};
		}
		/**
		* Creates a new function that constructs an instance of the given constructor function with the provided arguments.
		*
		* @param func - The constructor function to be wrapped and called.
		* @returns A new function that constructs an instance of the given constructor function with the provided arguments.
		*/
		function unconstruct(Func) {
			return function() {
				for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) args[_key4] = arguments[_key4];
				return construct(Func, args);
			};
		}
		/**
		* Add properties to a lookup table
		*
		* @param set - The set to which elements will be added.
		* @param array - The array containing elements to be added to the set.
		* @param transformCaseFunc - An optional function to transform the case of each element before adding to the set.
		* @returns The modified set with added elements.
		*/
		function addToSet(set, array) {
			let transformCaseFunc = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : stringToLowerCase;
			if (setPrototypeOf) setPrototypeOf(set, null);
			if (!arrayIsArray(array)) return set;
			let l = array.length;
			while (l--) {
				let element = array[l];
				if (typeof element === "string") {
					const lcElement = transformCaseFunc(element);
					if (lcElement !== element) {
						if (!isFrozen(array)) array[l] = lcElement;
						element = lcElement;
					}
				}
				set[element] = true;
			}
			return set;
		}
		/**
		* Clean up an array to harden against CSPP
		*
		* @param array - The array to be cleaned.
		* @returns The cleaned version of the array
		*/
		function cleanArray(array) {
			for (let index = 0; index < array.length; index++) if (!objectHasOwnProperty(array, index)) array[index] = null;
			return array;
		}
		/**
		* Shallow clone an object
		*
		* @param object - The object to be cloned.
		* @returns A new object that copies the original.
		*/
		function clone(object) {
			const newObject = create(null);
			for (const _ref2 of entries(object)) {
				var _ref3 = _slicedToArray(_ref2, 2);
				const property = _ref3[0];
				const value = _ref3[1];
				if (objectHasOwnProperty(object, property)) if (arrayIsArray(value)) newObject[property] = cleanArray(value);
				else if (value && typeof value === "object" && value.constructor === Object) newObject[property] = clone(value);
				else newObject[property] = value;
			}
			return newObject;
		}
		/**
		* Convert non-node values into strings without depending on direct property access.
		*
		* @param value - The value to stringify.
		* @returns A string representation of the provided value.
		*/
		function stringifyValue(value) {
			switch (typeof value) {
				case "string": return value;
				case "number": return numberToString(value);
				case "boolean": return booleanToString(value);
				case "bigint": return bigintToString ? bigintToString(value) : "0";
				case "symbol": return symbolToString ? symbolToString(value) : "Symbol()";
				case "undefined": return objectToString(value);
				case "function":
				case "object": {
					if (value === null) return objectToString(value);
					const valueAsRecord = value;
					const valueToString = lookupGetter(valueAsRecord, "toString");
					if (typeof valueToString === "function") {
						const stringified = valueToString(valueAsRecord);
						return typeof stringified === "string" ? stringified : objectToString(stringified);
					}
					return objectToString(value);
				}
				default: return objectToString(value);
			}
		}
		/**
		* This method automatically checks if the prop is function or getter and behaves accordingly.
		*
		* @param object - The object to look up the getter function in its prototype chain.
		* @param prop - The property name for which to find the getter function.
		* @returns The getter function found in the prototype chain or a fallback function.
		*/
		function lookupGetter(object, prop) {
			while (object !== null) {
				const desc = getOwnPropertyDescriptor(object, prop);
				if (desc) {
					if (desc.get) return unapply(desc.get);
					if (typeof desc.value === "function") return unapply(desc.value);
				}
				object = getPrototypeOf(object);
			}
			function fallbackValue() {
				return null;
			}
			return fallbackValue;
		}
		function isRegex(value) {
			try {
				regExpTest(value, "");
				return true;
			} catch (_unused) {
				return false;
			}
		}
		const html$1 = freeze([
			"a",
			"abbr",
			"acronym",
			"address",
			"area",
			"article",
			"aside",
			"audio",
			"b",
			"bdi",
			"bdo",
			"big",
			"blink",
			"blockquote",
			"body",
			"br",
			"button",
			"canvas",
			"caption",
			"center",
			"cite",
			"code",
			"col",
			"colgroup",
			"content",
			"data",
			"datalist",
			"dd",
			"decorator",
			"del",
			"details",
			"dfn",
			"dialog",
			"dir",
			"div",
			"dl",
			"dt",
			"element",
			"em",
			"fieldset",
			"figcaption",
			"figure",
			"font",
			"footer",
			"form",
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6",
			"head",
			"header",
			"hgroup",
			"hr",
			"html",
			"i",
			"img",
			"input",
			"ins",
			"kbd",
			"label",
			"legend",
			"li",
			"main",
			"map",
			"mark",
			"marquee",
			"menu",
			"menuitem",
			"meter",
			"nav",
			"nobr",
			"ol",
			"optgroup",
			"option",
			"output",
			"p",
			"picture",
			"pre",
			"progress",
			"q",
			"rp",
			"rt",
			"ruby",
			"s",
			"samp",
			"search",
			"section",
			"select",
			"shadow",
			"slot",
			"small",
			"source",
			"spacer",
			"span",
			"strike",
			"strong",
			"style",
			"sub",
			"summary",
			"sup",
			"table",
			"tbody",
			"td",
			"template",
			"textarea",
			"tfoot",
			"th",
			"thead",
			"time",
			"tr",
			"track",
			"tt",
			"u",
			"ul",
			"var",
			"video",
			"wbr"
		]);
		const svg$1 = freeze([
			"svg",
			"a",
			"altglyph",
			"altglyphdef",
			"altglyphitem",
			"animatecolor",
			"animatemotion",
			"animatetransform",
			"circle",
			"clippath",
			"defs",
			"desc",
			"ellipse",
			"enterkeyhint",
			"exportparts",
			"filter",
			"font",
			"g",
			"glyph",
			"glyphref",
			"hkern",
			"image",
			"inputmode",
			"line",
			"lineargradient",
			"marker",
			"mask",
			"metadata",
			"mpath",
			"part",
			"path",
			"pattern",
			"polygon",
			"polyline",
			"radialgradient",
			"rect",
			"stop",
			"style",
			"switch",
			"symbol",
			"text",
			"textpath",
			"title",
			"tref",
			"tspan",
			"view",
			"vkern"
		]);
		const svgFilters = freeze([
			"feBlend",
			"feColorMatrix",
			"feComponentTransfer",
			"feComposite",
			"feConvolveMatrix",
			"feDiffuseLighting",
			"feDisplacementMap",
			"feDistantLight",
			"feDropShadow",
			"feFlood",
			"feFuncA",
			"feFuncB",
			"feFuncG",
			"feFuncR",
			"feGaussianBlur",
			"feImage",
			"feMerge",
			"feMergeNode",
			"feMorphology",
			"feOffset",
			"fePointLight",
			"feSpecularLighting",
			"feSpotLight",
			"feTile",
			"feTurbulence"
		]);
		const svgDisallowed = freeze([
			"animate",
			"color-profile",
			"cursor",
			"discard",
			"font-face",
			"font-face-format",
			"font-face-name",
			"font-face-src",
			"font-face-uri",
			"foreignobject",
			"hatch",
			"hatchpath",
			"mesh",
			"meshgradient",
			"meshpatch",
			"meshrow",
			"missing-glyph",
			"script",
			"set",
			"solidcolor",
			"unknown",
			"use"
		]);
		const mathMl$1 = freeze([
			"math",
			"menclose",
			"merror",
			"mfenced",
			"mfrac",
			"mglyph",
			"mi",
			"mlabeledtr",
			"mmultiscripts",
			"mn",
			"mo",
			"mover",
			"mpadded",
			"mphantom",
			"mroot",
			"mrow",
			"ms",
			"mspace",
			"msqrt",
			"mstyle",
			"msub",
			"msup",
			"msubsup",
			"mtable",
			"mtd",
			"mtext",
			"mtr",
			"munder",
			"munderover",
			"mprescripts"
		]);
		const mathMlDisallowed = freeze([
			"maction",
			"maligngroup",
			"malignmark",
			"mlongdiv",
			"mscarries",
			"mscarry",
			"msgroup",
			"mstack",
			"msline",
			"msrow",
			"semantics",
			"annotation",
			"annotation-xml",
			"mprescripts",
			"none"
		]);
		const text = freeze(["#text"]);
		const html = freeze([
			"accept",
			"action",
			"align",
			"alt",
			"autocapitalize",
			"autocomplete",
			"autopictureinpicture",
			"autoplay",
			"background",
			"bgcolor",
			"border",
			"capture",
			"cellpadding",
			"cellspacing",
			"checked",
			"cite",
			"class",
			"clear",
			"color",
			"cols",
			"colspan",
			"command",
			"commandfor",
			"controls",
			"controlslist",
			"coords",
			"crossorigin",
			"datetime",
			"decoding",
			"default",
			"dir",
			"disabled",
			"disablepictureinpicture",
			"disableremoteplayback",
			"download",
			"draggable",
			"enctype",
			"enterkeyhint",
			"exportparts",
			"face",
			"for",
			"headers",
			"height",
			"hidden",
			"high",
			"href",
			"hreflang",
			"id",
			"inert",
			"inputmode",
			"integrity",
			"ismap",
			"kind",
			"label",
			"lang",
			"list",
			"loading",
			"loop",
			"low",
			"max",
			"maxlength",
			"media",
			"method",
			"min",
			"minlength",
			"multiple",
			"muted",
			"name",
			"nonce",
			"noshade",
			"novalidate",
			"nowrap",
			"open",
			"optimum",
			"part",
			"pattern",
			"placeholder",
			"playsinline",
			"popover",
			"popovertarget",
			"popovertargetaction",
			"poster",
			"preload",
			"pubdate",
			"radiogroup",
			"readonly",
			"rel",
			"required",
			"rev",
			"reversed",
			"role",
			"rows",
			"rowspan",
			"spellcheck",
			"scope",
			"selected",
			"shape",
			"size",
			"sizes",
			"slot",
			"span",
			"srclang",
			"start",
			"src",
			"srcset",
			"step",
			"style",
			"summary",
			"tabindex",
			"title",
			"translate",
			"type",
			"usemap",
			"valign",
			"value",
			"width",
			"wrap",
			"xmlns"
		]);
		const svg = freeze([
			"accent-height",
			"accumulate",
			"additive",
			"alignment-baseline",
			"amplitude",
			"ascent",
			"attributename",
			"attributetype",
			"azimuth",
			"basefrequency",
			"baseline-shift",
			"begin",
			"bias",
			"by",
			"class",
			"clip",
			"clippathunits",
			"clip-path",
			"clip-rule",
			"color",
			"color-interpolation",
			"color-interpolation-filters",
			"color-profile",
			"color-rendering",
			"cx",
			"cy",
			"d",
			"dx",
			"dy",
			"diffuseconstant",
			"direction",
			"display",
			"divisor",
			"dominant-baseline",
			"dur",
			"edgemode",
			"elevation",
			"end",
			"exponent",
			"fill",
			"fill-opacity",
			"fill-rule",
			"filter",
			"filterunits",
			"flood-color",
			"flood-opacity",
			"font-family",
			"font-size",
			"font-size-adjust",
			"font-stretch",
			"font-style",
			"font-variant",
			"font-weight",
			"fx",
			"fy",
			"g1",
			"g2",
			"glyph-name",
			"glyphref",
			"gradientunits",
			"gradienttransform",
			"height",
			"href",
			"id",
			"image-rendering",
			"in",
			"in2",
			"intercept",
			"k",
			"k1",
			"k2",
			"k3",
			"k4",
			"kerning",
			"keypoints",
			"keysplines",
			"keytimes",
			"lang",
			"lengthadjust",
			"letter-spacing",
			"kernelmatrix",
			"kernelunitlength",
			"lighting-color",
			"local",
			"marker-end",
			"marker-mid",
			"marker-start",
			"markerheight",
			"markerunits",
			"markerwidth",
			"maskcontentunits",
			"maskunits",
			"max",
			"mask",
			"mask-type",
			"media",
			"method",
			"mode",
			"min",
			"name",
			"numoctaves",
			"offset",
			"operator",
			"opacity",
			"order",
			"orient",
			"orientation",
			"origin",
			"overflow",
			"paint-order",
			"path",
			"pathlength",
			"patterncontentunits",
			"patterntransform",
			"patternunits",
			"pointer-events",
			"points",
			"preservealpha",
			"preserveaspectratio",
			"primitiveunits",
			"r",
			"rx",
			"ry",
			"radius",
			"refx",
			"refy",
			"repeatcount",
			"repeatdur",
			"restart",
			"result",
			"rotate",
			"scale",
			"seed",
			"shape-rendering",
			"slope",
			"specularconstant",
			"specularexponent",
			"spreadmethod",
			"startoffset",
			"stddeviation",
			"stitchtiles",
			"stop-color",
			"stop-opacity",
			"stroke-dasharray",
			"stroke-dashoffset",
			"stroke-linecap",
			"stroke-linejoin",
			"stroke-miterlimit",
			"stroke-opacity",
			"stroke",
			"stroke-width",
			"style",
			"surfacescale",
			"systemlanguage",
			"tabindex",
			"tablevalues",
			"targetx",
			"targety",
			"transform",
			"transform-origin",
			"text-anchor",
			"text-decoration",
			"text-orientation",
			"text-rendering",
			"textlength",
			"type",
			"u1",
			"u2",
			"unicode",
			"values",
			"vector-effect",
			"viewbox",
			"visibility",
			"version",
			"vert-adv-y",
			"vert-origin-x",
			"vert-origin-y",
			"width",
			"word-spacing",
			"wrap",
			"writing-mode",
			"xchannelselector",
			"ychannelselector",
			"x",
			"x1",
			"x2",
			"xmlns",
			"y",
			"y1",
			"y2",
			"z",
			"zoomandpan"
		]);
		const mathMl = freeze([
			"accent",
			"accentunder",
			"align",
			"bevelled",
			"close",
			"columnalign",
			"columnlines",
			"columnspacing",
			"columnspan",
			"denomalign",
			"depth",
			"dir",
			"display",
			"displaystyle",
			"encoding",
			"fence",
			"frame",
			"height",
			"href",
			"id",
			"largeop",
			"length",
			"linethickness",
			"lquote",
			"lspace",
			"mathbackground",
			"mathcolor",
			"mathsize",
			"mathvariant",
			"maxsize",
			"minsize",
			"movablelimits",
			"notation",
			"numalign",
			"open",
			"rowalign",
			"rowlines",
			"rowspacing",
			"rowspan",
			"rspace",
			"rquote",
			"scriptlevel",
			"scriptminsize",
			"scriptsizemultiplier",
			"selection",
			"separator",
			"separators",
			"stretchy",
			"subscriptshift",
			"supscriptshift",
			"symmetric",
			"voffset",
			"width",
			"xmlns"
		]);
		const xml = freeze([
			"xlink:href",
			"xml:id",
			"xlink:title",
			"xml:space",
			"xmlns:xlink"
		]);
		const MUSTACHE_EXPR = seal(/{{[\w\W]*|^[\w\W]*}}/g);
		const ERB_EXPR = seal(/<%[\w\W]*|^[\w\W]*%>/g);
		const TMPLIT_EXPR = seal(/\${[\w\W]*/g);
		const DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]+$/);
		const ARIA_ATTR = seal(/^aria-[\-\w]+$/);
		const IS_ALLOWED_URI = seal(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i);
		const IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
		const ATTR_WHITESPACE = seal(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g);
		const DOCTYPE_NAME = seal(/^html$/i);
		const CUSTOM_ELEMENT = seal(/^[a-z][.\w]*(-[.\w]+)+$/i);
		const ELEMENT_MARKUP_PROBE = seal(/<[/\w!]/g);
		const COMMENT_MARKUP_PROBE = seal(/<[/\w]/g);
		const FALLBACK_TAG_CLOSE = seal(/<\/no(script|embed|frames)/i);
		const SELF_CLOSING_TAG = seal(/\/>/i);
		const NODE_TYPE = {
			element: 1,
			attribute: 2,
			text: 3,
			cdataSection: 4,
			entityReference: 5,
			entityNode: 6,
			processingInstruction: 7,
			comment: 8,
			document: 9,
			documentType: 10,
			documentFragment: 11,
			notation: 12
		};
		const LITERAL_TEXT_ELEMENT_NAMES = [
			"style",
			"script",
			"xmp",
			"iframe",
			"noembed",
			"noframes",
			"plaintext",
			"noscript"
		];
		const LITERAL_TEXT_ELEMENTS = freeze(addToSet({}, LITERAL_TEXT_ELEMENT_NAMES));
		const LITERAL_TEXT_CLOSE = function() {
			const map = {};
			arrayForEach(LITERAL_TEXT_ELEMENT_NAMES, (name) => {
				map[name] = seal(new RegExp("</" + name + "(?=[\\t\\n\\f\\r />])", "i"));
			});
			return freeze(map);
		}();
		const getGlobal = function getGlobal() {
			return typeof window === "undefined" ? null : window;
		};
		/**
		* Creates a no-op policy for internal use only.
		* Don't export this function outside this module!
		* @param trustedTypes The policy factory.
		* @param purifyHostElement The Script element used to load DOMPurify (to determine policy name suffix).
		* @return The policy created (or null, if Trusted Types
		* are not supported or creating the policy failed).
		*/
		const _createTrustedTypesPolicy = function _createTrustedTypesPolicy(trustedTypes, purifyHostElement) {
			if (typeof trustedTypes !== "object" || typeof trustedTypes.createPolicy !== "function") return null;
			let suffix = null;
			const ATTR_NAME = "data-tt-policy-suffix";
			if (purifyHostElement && purifyHostElement.hasAttribute(ATTR_NAME)) suffix = purifyHostElement.getAttribute(ATTR_NAME);
			const policyName = "dompurify" + (suffix ? "#" + suffix : "");
			try {
				return trustedTypes.createPolicy(policyName, {
					createHTML(html) {
						return html;
					},
					createScriptURL(scriptUrl) {
						return scriptUrl;
					}
				});
			} catch (_) {
				console.warn("TrustedTypes policy " + policyName + " could not be created.");
				return null;
			}
		};
		const _createHooksMap = function _createHooksMap() {
			return {
				afterSanitizeAttributes: [],
				afterSanitizeElements: [],
				afterSanitizeShadowDOM: [],
				beforeSanitizeAttributes: [],
				beforeSanitizeElements: [],
				beforeSanitizeShadowDOM: [],
				uponSanitizeAttribute: [],
				uponSanitizeElement: [],
				uponSanitizeShadowNode: []
			};
		};
		/**
		* Resolve a set-valued configuration option: a fresh set built from
		* cfg[key] when it is an own array property (seeded with a clone of
		* options.base when given, case-normalized via options.transform),
		* the fallback set otherwise.
		*
		* @param cfg the cloned, prototype-free configuration object
		* @param key the configuration property to read
		* @param fallback the set to use when the option is absent or not an array
		* @param options transform and optional base set to merge into
		* @returns the resolved set
		*/
		const _resolveSetOption = function _resolveSetOption(cfg, key, fallback, options) {
			return objectHasOwnProperty(cfg, key) && arrayIsArray(cfg[key]) ? addToSet(options.base ? clone(options.base) : {}, cfg[key], options.transform) : fallback;
		};
		/**
		* Resolve an object-valued configuration option: a prototype-free clone
		* of cfg[key] when it is an own, truthy object property, else a fresh
		* fallback built by makeFallback (fresh on every parse, so a previous
		* parse can never leak state into the next one).
		*
		* @param cfg the cloned, prototype-free configuration object
		* @param key the configuration property to read
		* @param makeFallback builds the fallback value when the option is absent
		* @returns the resolved object
		*/
		const _resolveObjectOption = function _resolveObjectOption(cfg, key, makeFallback) {
			const value = objectHasOwnProperty(cfg, key) ? cfg[key] : void 0;
			return value && typeof value === "object" ? clone(value) : makeFallback();
		};
		function createDOMPurify() {
			let window = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : getGlobal();
			const DOMPurify = (root) => createDOMPurify(root);
			DOMPurify.version = "3.4.14";
			DOMPurify.removed = [];
			if (!window || !window.document || window.document.nodeType !== NODE_TYPE.document || !window.Element) {
				DOMPurify.isSupported = false;
				return DOMPurify;
			}
			let document = window.document;
			const originalDocument = document;
			const currentScript = originalDocument.currentScript;
			window.DocumentFragment;
			const HTMLTemplateElement = window.HTMLTemplateElement, Node = window.Node, Element = window.Element, NodeFilter = window.NodeFilter;
			window.NamedNodeMap === void 0 && (window.NamedNodeMap || window.MozNamedAttrMap);
			window.HTMLFormElement;
			const DOMParser = window.DOMParser, trustedTypes = window.trustedTypes;
			const ElementPrototype = Element.prototype;
			const cloneNode = lookupGetter(ElementPrototype, "cloneNode");
			const remove = lookupGetter(ElementPrototype, "remove");
			const getNextSibling = lookupGetter(ElementPrototype, "nextSibling");
			const getChildNodes = lookupGetter(ElementPrototype, "childNodes");
			const getParentNode = lookupGetter(ElementPrototype, "parentNode");
			const getShadowRoot = lookupGetter(ElementPrototype, "shadowRoot");
			const getAttributes = lookupGetter(ElementPrototype, "attributes");
			const getNodeType = Node && Node.prototype ? lookupGetter(Node.prototype, "nodeType") : null;
			const getNodeName = Node && Node.prototype ? lookupGetter(Node.prototype, "nodeName") : null;
			const getOwnerDocument = Node && Node.prototype ? lookupGetter(Node.prototype, "ownerDocument") : null;
			const _readNodeType = function _readNodeType(node) {
				return getNodeType ? getNodeType(node) : node.nodeType;
			};
			const _readNodeName = function _readNodeName(node) {
				return getNodeName ? getNodeName(node) : node.nodeName;
			};
			if (typeof HTMLTemplateElement === "function") {
				const template = document.createElement("template");
				if (template.content && template.content.ownerDocument) document = template.content.ownerDocument;
			}
			let trustedTypesPolicy;
			let emptyHTML = "";
			let defaultTrustedTypesPolicy;
			let defaultTrustedTypesPolicyResolved = false;
			let IN_TRUSTED_TYPES_POLICY = 0;
			const _assertNotInTrustedTypesPolicy = function _assertNotInTrustedTypesPolicy() {
				if (IN_TRUSTED_TYPES_POLICY > 0) throw typeErrorCreate("A configured TRUSTED_TYPES_POLICY callback (createHTML or createScriptURL) must not call DOMPurify.sanitize, as that causes infinite recursion. Do not pass a policy whose callbacks wrap DOMPurify as TRUSTED_TYPES_POLICY; see the \"DOMPurify and Trusted Types\" section of the README.");
			};
			const _createTrustedHTML = function _createTrustedHTML(html) {
				_assertNotInTrustedTypesPolicy();
				IN_TRUSTED_TYPES_POLICY++;
				try {
					return trustedTypesPolicy.createHTML(html);
				} finally {
					IN_TRUSTED_TYPES_POLICY--;
				}
			};
			const _createTrustedScriptURL = function _createTrustedScriptURL(scriptUrl) {
				_assertNotInTrustedTypesPolicy();
				IN_TRUSTED_TYPES_POLICY++;
				try {
					return trustedTypesPolicy.createScriptURL(scriptUrl);
				} finally {
					IN_TRUSTED_TYPES_POLICY--;
				}
			};
			const _getDefaultTrustedTypesPolicy = function _getDefaultTrustedTypesPolicy() {
				if (!defaultTrustedTypesPolicyResolved) {
					defaultTrustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, currentScript);
					defaultTrustedTypesPolicyResolved = true;
				}
				return defaultTrustedTypesPolicy;
			};
			const _document = document, implementation = _document.implementation, createNodeIterator = _document.createNodeIterator, createDocumentFragment = _document.createDocumentFragment, getElementsByTagName = _document.getElementsByTagName;
			const importNode = originalDocument.importNode;
			let hooks = _createHooksMap();
			/**
			* Expose whether this browser supports running the full DOMPurify.
			*/
			DOMPurify.isSupported = typeof entries === "function" && typeof getParentNode === "function" && implementation && implementation.createHTMLDocument !== void 0;
			const MUSTACHE_EXPR$1 = MUSTACHE_EXPR, ERB_EXPR$1 = ERB_EXPR, TMPLIT_EXPR$1 = TMPLIT_EXPR, DATA_ATTR$1 = DATA_ATTR, ARIA_ATTR$1 = ARIA_ATTR, IS_SCRIPT_OR_DATA$1 = IS_SCRIPT_OR_DATA, ATTR_WHITESPACE$1 = ATTR_WHITESPACE, CUSTOM_ELEMENT$1 = CUSTOM_ELEMENT;
			let IS_ALLOWED_URI$1 = IS_ALLOWED_URI;
			/**
			* We consider the elements and attributes below to be safe. Ideally
			* don't add any new ones but feel free to remove unwanted ones.
			*/
			let ALLOWED_TAGS = null;
			const DEFAULT_ALLOWED_TAGS = addToSet({}, [
				...html$1,
				...svg$1,
				...svgFilters,
				...mathMl$1,
				...text
			]);
			let ALLOWED_ATTR = null;
			const DEFAULT_ALLOWED_ATTR = addToSet({}, [
				...html,
				...svg,
				...mathMl,
				...xml
			]);
			let CUSTOM_ELEMENT_HANDLING = Object.seal(create(null, {
				tagNameCheck: {
					writable: true,
					configurable: false,
					enumerable: true,
					value: null
				},
				attributeNameCheck: {
					writable: true,
					configurable: false,
					enumerable: true,
					value: null
				},
				allowCustomizedBuiltInElements: {
					writable: true,
					configurable: false,
					enumerable: true,
					value: false
				}
			}));
			let FORBID_TAGS = null;
			let FORBID_ATTR = null;
			const EXTRA_ELEMENT_HANDLING = Object.seal(create(null, {
				tagCheck: {
					writable: true,
					configurable: false,
					enumerable: true,
					value: null
				},
				attributeCheck: {
					writable: true,
					configurable: false,
					enumerable: true,
					value: null
				}
			}));
			let ALLOW_ARIA_ATTR = true;
			let ALLOW_DATA_ATTR = true;
			let ALLOW_UNKNOWN_PROTOCOLS = false;
			let ALLOW_SELF_CLOSE_IN_ATTR = true;
			let SAFE_FOR_TEMPLATES = false;
			let SAFE_FOR_XML = true;
			let WHOLE_DOCUMENT = false;
			let SET_CONFIG = false;
			let SET_CONFIG_ALLOWED_TAGS = null;
			let SET_CONFIG_ALLOWED_ATTR = null;
			let FORCE_BODY = false;
			let RETURN_DOM = false;
			let RETURN_DOM_FRAGMENT = false;
			let RETURN_TRUSTED_TYPE = false;
			let SANITIZE_DOM = true;
			let SANITIZE_NAMED_PROPS = false;
			const SANITIZE_NAMED_PROPS_PREFIX = "user-content-";
			let KEEP_CONTENT = true;
			let IN_PLACE = false;
			let USE_PROFILES = {};
			let FORBID_CONTENTS = null;
			const DEFAULT_FORBID_CONTENTS = addToSet({}, [
				"annotation-xml",
				"audio",
				"colgroup",
				"desc",
				"foreignobject",
				"head",
				"iframe",
				"math",
				"mi",
				"mn",
				"mo",
				"ms",
				"mtext",
				"noembed",
				"noframes",
				"noscript",
				"plaintext",
				"script",
				"selectedcontent",
				"style",
				"svg",
				"template",
				"thead",
				"title",
				"video",
				"xmp"
			]);
			let DATA_URI_TAGS = null;
			const DEFAULT_DATA_URI_TAGS = addToSet({}, [
				"audio",
				"video",
				"img",
				"source",
				"image",
				"track"
			]);
			let URI_SAFE_ATTRIBUTES = null;
			const DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, [
				"alt",
				"class",
				"for",
				"id",
				"label",
				"name",
				"pattern",
				"placeholder",
				"role",
				"summary",
				"title",
				"value",
				"style",
				"xmlns"
			]);
			const MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";
			const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
			const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
			let NAMESPACE = HTML_NAMESPACE;
			let IS_EMPTY_INPUT = false;
			let ALLOWED_NAMESPACES = null;
			const DEFAULT_ALLOWED_NAMESPACES = addToSet({}, [
				MATHML_NAMESPACE,
				SVG_NAMESPACE,
				HTML_NAMESPACE
			], stringToString);
			const DEFAULT_MATHML_TEXT_INTEGRATION_POINTS = freeze([
				"mi",
				"mo",
				"mn",
				"ms",
				"mtext"
			]);
			let MATHML_TEXT_INTEGRATION_POINTS = addToSet({}, DEFAULT_MATHML_TEXT_INTEGRATION_POINTS);
			const DEFAULT_HTML_INTEGRATION_POINTS = freeze(["annotation-xml"]);
			let HTML_INTEGRATION_POINTS = addToSet({}, DEFAULT_HTML_INTEGRATION_POINTS);
			const COMMON_SVG_AND_HTML_ELEMENTS = addToSet({}, [
				"title",
				"style",
				"font",
				"a",
				"script"
			]);
			let PARSER_MEDIA_TYPE = null;
			const SUPPORTED_PARSER_MEDIA_TYPES = ["application/xhtml+xml", "text/html"];
			const DEFAULT_PARSER_MEDIA_TYPE = "text/html";
			let transformCaseFunc = null;
			let CONFIG = null;
			const formElement = document.createElement("form");
			const isRegexOrFunction = function isRegexOrFunction(testValue) {
				return testValue instanceof RegExp || testValue instanceof Function;
			};
			/**
			* _parseConfig
			*
			* @param cfg optional config literal
			*/
			const _parseConfig = function _parseConfig() {
				let cfg = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
				if (CONFIG && CONFIG === cfg) return;
				if (!cfg || typeof cfg !== "object") cfg = {};
				cfg = clone(cfg);
				PARSER_MEDIA_TYPE = SUPPORTED_PARSER_MEDIA_TYPES.indexOf(cfg.PARSER_MEDIA_TYPE) === -1 ? DEFAULT_PARSER_MEDIA_TYPE : cfg.PARSER_MEDIA_TYPE;
				transformCaseFunc = PARSER_MEDIA_TYPE === "application/xhtml+xml" ? stringToString : stringToLowerCase;
				ALLOWED_TAGS = _resolveSetOption(cfg, "ALLOWED_TAGS", DEFAULT_ALLOWED_TAGS, { transform: transformCaseFunc });
				ALLOWED_ATTR = _resolveSetOption(cfg, "ALLOWED_ATTR", DEFAULT_ALLOWED_ATTR, { transform: transformCaseFunc });
				ALLOWED_NAMESPACES = _resolveSetOption(cfg, "ALLOWED_NAMESPACES", DEFAULT_ALLOWED_NAMESPACES, { transform: stringToString });
				URI_SAFE_ATTRIBUTES = _resolveSetOption(cfg, "ADD_URI_SAFE_ATTR", DEFAULT_URI_SAFE_ATTRIBUTES, {
					transform: transformCaseFunc,
					base: DEFAULT_URI_SAFE_ATTRIBUTES
				});
				DATA_URI_TAGS = _resolveSetOption(cfg, "ADD_DATA_URI_TAGS", DEFAULT_DATA_URI_TAGS, {
					transform: transformCaseFunc,
					base: DEFAULT_DATA_URI_TAGS
				});
				FORBID_CONTENTS = _resolveSetOption(cfg, "FORBID_CONTENTS", DEFAULT_FORBID_CONTENTS, { transform: transformCaseFunc });
				FORBID_TAGS = _resolveSetOption(cfg, "FORBID_TAGS", clone({}), { transform: transformCaseFunc });
				FORBID_ATTR = _resolveSetOption(cfg, "FORBID_ATTR", clone({}), { transform: transformCaseFunc });
				USE_PROFILES = objectHasOwnProperty(cfg, "USE_PROFILES") ? cfg.USE_PROFILES && typeof cfg.USE_PROFILES === "object" ? clone(cfg.USE_PROFILES) : cfg.USE_PROFILES : false;
				ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false;
				ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false;
				ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false;
				ALLOW_SELF_CLOSE_IN_ATTR = cfg.ALLOW_SELF_CLOSE_IN_ATTR !== false;
				SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false;
				SAFE_FOR_XML = cfg.SAFE_FOR_XML !== false;
				WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false;
				RETURN_DOM = cfg.RETURN_DOM || false;
				RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false;
				RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false;
				FORCE_BODY = cfg.FORCE_BODY || false;
				SANITIZE_DOM = cfg.SANITIZE_DOM !== false;
				SANITIZE_NAMED_PROPS = cfg.SANITIZE_NAMED_PROPS || false;
				KEEP_CONTENT = cfg.KEEP_CONTENT !== false;
				IN_PLACE = cfg.IN_PLACE || false;
				IS_ALLOWED_URI$1 = isRegex(cfg.ALLOWED_URI_REGEXP) ? cfg.ALLOWED_URI_REGEXP : IS_ALLOWED_URI;
				NAMESPACE = typeof cfg.NAMESPACE === "string" ? cfg.NAMESPACE : HTML_NAMESPACE;
				MATHML_TEXT_INTEGRATION_POINTS = _resolveObjectOption(cfg, "MATHML_TEXT_INTEGRATION_POINTS", () => addToSet({}, DEFAULT_MATHML_TEXT_INTEGRATION_POINTS));
				HTML_INTEGRATION_POINTS = _resolveObjectOption(cfg, "HTML_INTEGRATION_POINTS", () => addToSet({}, DEFAULT_HTML_INTEGRATION_POINTS));
				const customElementHandling = _resolveObjectOption(cfg, "CUSTOM_ELEMENT_HANDLING", () => create(null));
				CUSTOM_ELEMENT_HANDLING = create(null);
				if (objectHasOwnProperty(customElementHandling, "tagNameCheck") && isRegexOrFunction(customElementHandling.tagNameCheck)) CUSTOM_ELEMENT_HANDLING.tagNameCheck = customElementHandling.tagNameCheck;
				if (objectHasOwnProperty(customElementHandling, "attributeNameCheck") && isRegexOrFunction(customElementHandling.attributeNameCheck)) CUSTOM_ELEMENT_HANDLING.attributeNameCheck = customElementHandling.attributeNameCheck;
				if (objectHasOwnProperty(customElementHandling, "allowCustomizedBuiltInElements") && typeof customElementHandling.allowCustomizedBuiltInElements === "boolean") CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements = customElementHandling.allowCustomizedBuiltInElements;
				seal(CUSTOM_ELEMENT_HANDLING);
				if (SAFE_FOR_TEMPLATES) ALLOW_DATA_ATTR = false;
				if (RETURN_DOM_FRAGMENT) RETURN_DOM = true;
				if (USE_PROFILES) {
					ALLOWED_TAGS = addToSet({}, text);
					ALLOWED_ATTR = create(null);
					if (USE_PROFILES.html === true) {
						addToSet(ALLOWED_TAGS, html$1);
						addToSet(ALLOWED_ATTR, html);
					}
					if (USE_PROFILES.svg === true) {
						addToSet(ALLOWED_TAGS, svg$1);
						addToSet(ALLOWED_ATTR, svg);
						addToSet(ALLOWED_ATTR, xml);
					}
					if (USE_PROFILES.svgFilters === true) {
						addToSet(ALLOWED_TAGS, svgFilters);
						addToSet(ALLOWED_ATTR, svg);
						addToSet(ALLOWED_ATTR, xml);
					}
					if (USE_PROFILES.mathMl === true) {
						addToSet(ALLOWED_TAGS, mathMl$1);
						addToSet(ALLOWED_ATTR, mathMl);
						addToSet(ALLOWED_ATTR, xml);
					}
				}
				EXTRA_ELEMENT_HANDLING.tagCheck = null;
				EXTRA_ELEMENT_HANDLING.attributeCheck = null;
				if (objectHasOwnProperty(cfg, "ADD_TAGS")) {
					if (typeof cfg.ADD_TAGS === "function") EXTRA_ELEMENT_HANDLING.tagCheck = cfg.ADD_TAGS;
					else if (arrayIsArray(cfg.ADD_TAGS)) {
						if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) ALLOWED_TAGS = clone(ALLOWED_TAGS);
						addToSet(ALLOWED_TAGS, cfg.ADD_TAGS, transformCaseFunc);
					}
				}
				if (objectHasOwnProperty(cfg, "ADD_ATTR")) {
					if (typeof cfg.ADD_ATTR === "function") EXTRA_ELEMENT_HANDLING.attributeCheck = cfg.ADD_ATTR;
					else if (arrayIsArray(cfg.ADD_ATTR)) {
						if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) ALLOWED_ATTR = clone(ALLOWED_ATTR);
						addToSet(ALLOWED_ATTR, cfg.ADD_ATTR, transformCaseFunc);
					}
				}
				if (objectHasOwnProperty(cfg, "ADD_FORBID_CONTENTS") && arrayIsArray(cfg.ADD_FORBID_CONTENTS)) {
					if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS) FORBID_CONTENTS = clone(FORBID_CONTENTS);
					addToSet(FORBID_CONTENTS, cfg.ADD_FORBID_CONTENTS, transformCaseFunc);
				}
				if (KEEP_CONTENT) ALLOWED_TAGS["#text"] = true;
				if (WHOLE_DOCUMENT) addToSet(ALLOWED_TAGS, [
					"html",
					"head",
					"body"
				]);
				if (ALLOWED_TAGS.table) {
					addToSet(ALLOWED_TAGS, ["tbody"]);
					delete FORBID_TAGS.tbody;
				}
				if (cfg.TRUSTED_TYPES_POLICY) {
					if (typeof cfg.TRUSTED_TYPES_POLICY.createHTML !== "function") throw typeErrorCreate("TRUSTED_TYPES_POLICY configuration option must provide a \"createHTML\" hook.");
					if (typeof cfg.TRUSTED_TYPES_POLICY.createScriptURL !== "function") throw typeErrorCreate("TRUSTED_TYPES_POLICY configuration option must provide a \"createScriptURL\" hook.");
					const previousTrustedTypesPolicy = trustedTypesPolicy;
					trustedTypesPolicy = cfg.TRUSTED_TYPES_POLICY;
					try {
						emptyHTML = _createTrustedHTML("");
					} catch (error) {
						trustedTypesPolicy = previousTrustedTypesPolicy;
						throw error;
					}
				} else if (cfg.TRUSTED_TYPES_POLICY === null) {
					trustedTypesPolicy = void 0;
					emptyHTML = "";
				} else {
					if (trustedTypesPolicy === void 0) trustedTypesPolicy = _getDefaultTrustedTypesPolicy();
					if (trustedTypesPolicy && typeof emptyHTML === "string") emptyHTML = _createTrustedHTML("");
				}
				if (freeze) freeze(cfg);
				CONFIG = cfg;
			};
			const ALL_SVG_TAGS = addToSet({}, [
				...svg$1,
				...svgFilters,
				...svgDisallowed
			]);
			const ALL_MATHML_TAGS = addToSet({}, [...mathMl$1, ...mathMlDisallowed]);
			/**
			* Namespace rules for an element in the SVG namespace.
			*
			* @param tagName the element's lowercase tag name
			* @param parent the (possibly simulated) parent node
			* @param parentTagName the parent's lowercase tag name
			* @returns true if a spec-compliant parser could produce this element
			*/
			const _checkSvgNamespace = function _checkSvgNamespace(tagName, parent, parentTagName) {
				if (parent.namespaceURI === HTML_NAMESPACE) return tagName === "svg";
				if (parent.namespaceURI === MATHML_NAMESPACE) return tagName === "svg" && (parentTagName === "annotation-xml" || MATHML_TEXT_INTEGRATION_POINTS[parentTagName]);
				return Boolean(ALL_SVG_TAGS[tagName]);
			};
			/**
			* Namespace rules for an element in the MathML namespace.
			*
			* @param tagName the element's lowercase tag name
			* @param parent the (possibly simulated) parent node
			* @param parentTagName the parent's lowercase tag name
			* @returns true if a spec-compliant parser could produce this element
			*/
			const _checkMathMlNamespace = function _checkMathMlNamespace(tagName, parent, parentTagName) {
				if (parent.namespaceURI === HTML_NAMESPACE) return tagName === "math";
				if (parent.namespaceURI === SVG_NAMESPACE) return tagName === "math" && HTML_INTEGRATION_POINTS[parentTagName];
				return Boolean(ALL_MATHML_TAGS[tagName]);
			};
			/**
			* Namespace rules for an element in the HTML namespace.
			*
			* @param tagName the element's lowercase tag name
			* @param parent the (possibly simulated) parent node
			* @param parentTagName the parent's lowercase tag name
			* @returns true if a spec-compliant parser could produce this element
			*/
			const _checkHtmlNamespace = function _checkHtmlNamespace(tagName, parent, parentTagName) {
				if (parent.namespaceURI === SVG_NAMESPACE && !HTML_INTEGRATION_POINTS[parentTagName]) return false;
				if (parent.namespaceURI === MATHML_NAMESPACE && !MATHML_TEXT_INTEGRATION_POINTS[parentTagName]) return false;
				return !ALL_MATHML_TAGS[tagName] && (COMMON_SVG_AND_HTML_ELEMENTS[tagName] || !ALL_SVG_TAGS[tagName]);
			};
			/**
			* @param element a DOM element whose namespace is being checked
			* @returns Return false if the element has a
			*  namespace that a spec-compliant parser would never
			*  return. Return true otherwise.
			*/
			const _checkValidNamespace = function _checkValidNamespace(element) {
				let parent = getParentNode(element);
				if (!parent || !parent.tagName) parent = {
					namespaceURI: NAMESPACE,
					tagName: "template"
				};
				const tagName = stringToLowerCase(element.tagName);
				const parentTagName = stringToLowerCase(parent.tagName);
				if (!ALLOWED_NAMESPACES[element.namespaceURI]) return false;
				if (element.namespaceURI === SVG_NAMESPACE) return _checkSvgNamespace(tagName, parent, parentTagName);
				if (element.namespaceURI === MATHML_NAMESPACE) return _checkMathMlNamespace(tagName, parent, parentTagName);
				if (element.namespaceURI === HTML_NAMESPACE) return _checkHtmlNamespace(tagName, parent, parentTagName);
				if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && ALLOWED_NAMESPACES[element.namespaceURI]) return true;
				return false;
			};
			/**
			* _forceRemove
			*
			* @param node a DOM node
			*/
			const _forceRemove = function _forceRemove(node) {
				arrayPush(DOMPurify.removed, { element: node });
				try {
					getParentNode(node).removeChild(node);
				} catch (_) {
					remove(node);
					if (!getParentNode(node)) throw typeErrorCreate("a node selected for removal could not be detached from its tree and cannot be safely returned; refusing to sanitize in place");
				}
			};
			/**
			* _stripAttributeNode
			*
			* Remove a single Attr node case/namespace-exactly on an attribute-teardown
			* path. Name-based removeAttribute() ASCII-lowercases its lookup key for an
			* HTML element in an HTML document and so silently misses a case-preserved
			* handler (e.g. `ONERROR` off an XML/XHTML import) - the same defect
			* _removeAttribute() was fixed for, which a name-based call would reintroduce
			* on these IN_PLACE teardown paths. Unlike _removeAttribute this does not
			* record into DOMPurify.removed: the neutralize passes intentionally do not
			* book-keep. A clobbered/detached node falls back to best-effort name-based
			* removal.
			*
			* @param element the element to strip the attribute from
			* @param attribute the Attr node to remove
			* @param name the attribute's name, for the fallback path
			*/
			const _stripAttributeNode = function _stripAttributeNode(element, attribute, name) {
				try {
					element.removeAttributeNode(attribute);
				} catch (_) {
					try {
						element.removeAttribute(name);
					} catch (_) {}
				}
			};
			/**
			* _neutralizeRoot
			*
			* Fail-closed teardown of an in-place root after the sanitize walk aborts
			* (campaign-3 F2). An internal throw mid-walk — e.g. a page-registered
			* custom element's reaction detaches a node so `_forceRemove`'s deliberate
			* parentless guard throws, or any other re-entrant engine mutation — would
			* otherwise leave the caller's *live* tree half-sanitized, with everything
			* after the abort point still carrying its handlers. There is no safe way
			* to resume the walk (the tree mutated under us), so we strip the root bare:
			* remove every child and every attribute, then let the caller's catch see
			* the original error. Clobber-safe (cached `remove`/`childNodes`/`attributes`
			* getters; the root was already clobber-pre-flighted at the IN_PLACE entry).
			*
			* @param root the in-place root to empty
			*/
			const _neutralizeRoot = function _neutralizeRoot(root) {
				_neutralizeSubtree(root);
				const childNodes = getChildNodes(root);
				if (childNodes) {
					const snapshot = [];
					arrayForEach(childNodes, (child) => {
						arrayPush(snapshot, child);
					});
					arrayForEach(snapshot, (child) => {
						try {
							remove(child);
						} catch (_) {}
					});
				}
				const attributes = getAttributes(root);
				if (attributes) for (let i = attributes.length - 1; i >= 0; --i) {
					const attribute = attributes[i];
					const name = attribute && attribute.name;
					if (typeof name === "string") _stripAttributeNode(root, attribute, name);
				}
			};
			/**
			* _removeAttribute
			*
			* Name-based getAttributeNode()/removeAttribute() ASCII-lowercase their
			* lookup key for HTML elements in an HTML document, so they silently miss an
			* attribute whose stored qualified name still contains uppercase ASCII
			* letters. That happens when the node came from a case-preserving source
			* (an XML/XHTML document imported via importNode(), or createAttributeNS()),
			* where e.g. `ONERROR` survives the walk: the policy check lowercases to
			* `onerror` and rejects it, but `removeAttribute('ONERROR')` looks up
			* `onerror` and finds nothing. Remove the exact Attr node instead, which is
			* case- and namespace-exact, and fall back to name-based removal only when
			* the caller could not supply the node.
			*
			* @param name an Attribute name
			* @param element a DOM node
			* @param attr the exact Attr node to remove, when the caller has it
			*/
			const _removeAttribute = function _removeAttribute(name, element, attr) {
				if (!attr) try {
					attr = element.getAttributeNode(name);
				} catch (_) {
					attr = null;
				}
				arrayPush(DOMPurify.removed, {
					attribute: attr || null,
					from: element
				});
				try {
					if (attr) element.removeAttributeNode(attr);
					else element.removeAttribute(name);
				} catch (_) {
					try {
						element.removeAttribute(name);
					} catch (_) {}
				}
				if (name === "is") if (RETURN_DOM || RETURN_DOM_FRAGMENT) try {
					_forceRemove(element);
				} catch (_) {}
				else try {
					element.setAttribute(name, "");
				} catch (_) {}
			};
			/**
			* _stripDisallowedAttributes
			*
			* Removes every attribute the active configuration does not allow from a
			* single element, using the same allowlist as the main attribute pass (so
			* `on*` handlers go, but no `/^on/` blocklist is introduced). Used only to
			* neutralise nodes that are being discarded from an in-place tree.
			*
			* @param element the element to strip
			*/
			const _stripDisallowedAttributes = function _stripDisallowedAttributes(element) {
				const attributes = getAttributes(element);
				if (!attributes) return;
				for (let i = attributes.length - 1; i >= 0; --i) {
					const attribute = attributes[i];
					const name = attribute && attribute.name;
					if (typeof name !== "string" || ALLOWED_ATTR[transformCaseFunc(name)]) continue;
					_stripAttributeNode(element, attribute, name);
				}
			};
			/**
			* _neutralizeSubtree
			*
			* Completes the audit-5 F1 fix across every removal path. The KEEP_CONTENT
			* move-hoist neutralises only disallowed-tag removals; clobber, mXSS-canary,
			* namespace, comment, processing-instruction and KEEP_CONTENT:false removals
			* all drop their subtree wholesale via `_forceRemove`. On the IN_PLACE path
			* those dropped nodes are detached from the caller's LIVE tree but a
			* handler-bearing original among them (an `<img onerror>`/`<video>` that was
			* loading) keeps its queued resource event, which fires in page scope after
			* sanitize returns. This walks a removed subtree and strips every attribute
			* the active configuration does not allow — so `on*` handlers are cancelled
			* through the SAME allowlist that governs kept nodes, not a separate `/^on/`
			* blocklist. Run synchronously before sanitize returns, i.e. before any
			* queued event can fire. Hook-free by design: these nodes leave the output,
			* so firing attribute hooks for them would be surprising. Clobber-safe reads;
			* a doomed clobbered node may shadow `removeAttribute` (its own attributes are
			* irrelevant — it is discarded — while its non-clobbered descendants, e.g.
			* the `<img>`, are reached and scrubbed).
			*
			* @param root the root of a removed subtree to neutralise
			*/
			const _neutralizeSubtree = function _neutralizeSubtree(root) {
				const stack = [root];
				while (stack.length > 0) {
					const node = stack.pop();
					if (_readNodeType(node) === NODE_TYPE.element) _stripDisallowedAttributes(node);
					const childNodes = getChildNodes(node);
					if (childNodes) for (let i = childNodes.length - 1; i >= 0; --i) stack.push(childNodes[i]);
				}
			};
			/**
			* _neutralizePatchLinkage
			*
			* IN_PLACE entry pre-pass (declarative-partial-updates / streaming
			* hardening, https://github.com/WICG/declarative-partial-updates).
			*
			* The main walk strips patch linkage (`for`/`patchsrc`) and removes range
			* markers (PIs / markup comments) node-by-node, in document order, AS it
			* reaches each node. On a live in-place root that leaves a window: from the
			* moment the root is connected until the walk arrives at a given node, that
			* node's linkage is live. A patch applied on connection/stream can fire as
			* a microtask during the walk and inject or teleport an unsanitized DOM
			* range into a region the iterator has already passed and will not revisit,
			* so the post-return "tree is sanitized" contract is violated. Sweep the
			* whole tree once up front and sever every linkage before the walk begins,
			* closing that window.
			*
			* This CANNOT undo a patch that already fired before sanitize ran — that is
			* the irreducible "do not IN_PLACE a live-connected attacker tree" caveat —
			* but it closes everything from sanitize-start onward. Gated on SAFE_FOR_XML
			* to group with the rest of the declarative-partial-updates handling and
			* stay overridable, consistent with the codebase.
			*
			* Clobber-safe traversal (cached childNodes getter); per-node try/catch so a
			* clobbered root cannot defeat the sweep of its non-clobbered descendants.
			*
			* NOTE (pending real-Chrome confirmation, see test/declarative-patch-probe
			* .html Q1): this mirrors the existing policy of keeping `for` on
			* <label>/<output>. If the shipping feature can drive a patch through a
			* surviving `for`-on-label/output + `id` pair, this pre-pass and the
			* attribute check at _isBasicCustomElement's caller must additionally drop
			* that pair on the IN_PLACE path. Left as-is until the taxonomy is verified.
			*
			* @param root the in-place root to sweep
			*/
			/**
			* Central policy for declarative-partial-updates patch-linkage attributes,
			* shared by the _neutralizePatchLinkage pre-pass and _isValidAttribute so
			* the two sites cannot drift: `patchsrc` always links, `for` links
			* everywhere except on <label>/<output>, and the whole policy is gated on
			* SAFE_FOR_XML (see the rationale block in _isValidAttribute).
			*
			* @param lcName the transformCaseFunc'd attribute name
			* @param lcTag the transformCaseFunc'd tag name of the carrying element
			* @return true if the attribute is patch linkage and must be dropped
			*/
			const _isPatchLinkageAttribute = function _isPatchLinkageAttribute(lcName, lcTag) {
				if (!SAFE_FOR_XML) return false;
				if (lcName === "patchsrc") return true;
				return lcName === "for" && lcTag !== "label" && lcTag !== "output";
			};
			const _neutralizePatchLinkage = function _neutralizePatchLinkage(root) {
				if (!SAFE_FOR_XML) return;
				const stack = [root];
				while (stack.length > 0) {
					const node = stack.pop();
					const nodeType = _readNodeType(node);
					if (nodeType === NODE_TYPE.processingInstruction || nodeType === NODE_TYPE.comment && regExpTest(COMMENT_MARKUP_PROBE, node.data)) {
						try {
							remove(node);
						} catch (_) {}
						continue;
					}
					if (nodeType === NODE_TYPE.element) {
						const element = node;
						const lcTag = transformCaseFunc(_readNodeName(node));
						try {
							if (element.hasAttribute && element.hasAttribute("patchsrc")) element.removeAttribute("patchsrc");
							if (element.hasAttribute && element.hasAttribute("for") && _isPatchLinkageAttribute("for", lcTag)) element.removeAttribute("for");
						} catch (_) {}
					}
					const childNodes = getChildNodes(node);
					if (childNodes) for (let i = childNodes.length - 1; i >= 0; --i) stack.push(childNodes[i]);
				}
			};
			/**
			* _initDocument
			*
			* @param dirty - a string of dirty markup
			* @return a DOM, filled with the dirty markup
			*/
			const _initDocument = function _initDocument(dirty) {
				let doc = null;
				let leadingWhitespace = null;
				if (FORCE_BODY) dirty = "<remove></remove>" + dirty;
				else {
					const matches = stringMatch(dirty, /^[\r\n\t ]+/);
					leadingWhitespace = matches && matches[0];
				}
				if (PARSER_MEDIA_TYPE === "application/xhtml+xml" && NAMESPACE === HTML_NAMESPACE) dirty = "<html xmlns=\"http://www.w3.org/1999/xhtml\"><head></head><body>" + dirty + "</body></html>";
				const dirtyPayload = trustedTypesPolicy ? _createTrustedHTML(dirty) : dirty;
				if (NAMESPACE === HTML_NAMESPACE) try {
					doc = new DOMParser().parseFromString(dirtyPayload, PARSER_MEDIA_TYPE);
				} catch (_) {}
				if (!doc || !doc.documentElement) {
					doc = implementation.createDocument(NAMESPACE, "template", null);
					try {
						doc.documentElement.innerHTML = IS_EMPTY_INPUT ? emptyHTML : dirtyPayload;
					} catch (_) {}
				}
				const body = doc.body || doc.documentElement;
				if (dirty && leadingWhitespace) body.insertBefore(document.createTextNode(leadingWhitespace), body.childNodes[0] || null);
				if (NAMESPACE === HTML_NAMESPACE) return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? "html" : "body")[0];
				return WHOLE_DOCUMENT ? doc.documentElement : body;
			};
			/**
			* Creates a NodeIterator object that you can use to traverse filtered lists of nodes or elements in a document.
			*
			* @param root The root element or node to start traversing on.
			* @return The created NodeIterator
			*/
			const _createNodeIterator = function _createNodeIterator(root) {
				const doc = getOwnerDocument ? getOwnerDocument(root) : root.ownerDocument;
				return createNodeIterator.call(doc || root, root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_PROCESSING_INSTRUCTION | NodeFilter.SHOW_CDATA_SECTION, null);
			};
			/**
			* Replace template expression syntax (mustache, ERB, template
			* literal) with a space; shared by all SAFE_FOR_TEMPLATES scrub
			* sites. Order matters: mustache, then ERB, then template literal.
			*
			* @param value the string to scrub
			* @returns the scrubbed string
			*/
			const _stripTemplateExpressions = function _stripTemplateExpressions(value) {
				value = stringReplace(value, MUSTACHE_EXPR$1, " ");
				value = stringReplace(value, ERB_EXPR$1, " ");
				value = stringReplace(value, TMPLIT_EXPR$1, " ");
				return value;
			};
			/**
			* Strip template-engine expressions ({{...}}, ${...}, <%...%>) from the
			* character data of an element subtree. Used as the final safety net for
			* SAFE_FOR_TEMPLATES on every DOM-returning code path so that expressions
			* which only form after text-node normalization (e.g. fragments split across
			* stripped elements) cannot survive into a template-evaluating framework.
			*
			* Walks text/comment/CDATA/processing-instruction nodes and mutates `.data`
			* in place rather than round-tripping through innerHTML. This preserves
			* descendant node references (important for IN_PLACE callers), avoids a
			* serialize/reparse cycle, and reads literal character data — which means
			* `<%...%>` in text content matches the ERB regex against its real bytes
			* instead of the HTML-entity-escaped form innerHTML would produce.
			*
			* Attribute values are not visited here; SAFE_FOR_TEMPLATES handling for
			* attributes is performed during the per-node `_sanitizeAttributes` pass.
			*
			* @param node The root element whose character data should be scrubbed.
			*/
			const _scrubTemplateExpressions2 = function _scrubTemplateExpressions(node) {
				var _node$querySelectorAl;
				node.normalize();
				const doc = getOwnerDocument ? getOwnerDocument(node) : node.ownerDocument;
				const walker = createNodeIterator.call(doc || node, node, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_CDATA_SECTION | NodeFilter.SHOW_PROCESSING_INSTRUCTION, null);
				let currentNode = walker.nextNode();
				while (currentNode) {
					currentNode.data = _stripTemplateExpressions(currentNode.data);
					currentNode = walker.nextNode();
				}
				const templates = (_node$querySelectorAl = node.querySelectorAll) === null || _node$querySelectorAl === void 0 ? void 0 : _node$querySelectorAl.call(node, "template");
				if (templates) arrayForEach(templates, (tmpl) => {
					if (_isDocumentFragment(tmpl.content)) _scrubTemplateExpressions2(tmpl.content);
				});
			};
			/**
			* _isClobbered
			*
			* Detect DOM-clobbering on HTMLFormElement nodes. Form is the only HTML
			* interface with [LegacyOverrideBuiltIns]; a descendant element with a
			* `name` attribute matching a prototype property shadows that property
			* on direct reads. We use this check at the IN_PLACE entry-point and
			* during attribute sanitization to refuse clobbered forms.
			*
			* @param element element to check for clobbering attacks
			* @return true if clobbered, false if safe
			*/
			const _isClobbered = function _isClobbered(element) {
				const realTagName = getNodeName ? getNodeName(element) : null;
				if (typeof realTagName !== "string") return false;
				if (transformCaseFunc(realTagName) !== "form") return false;
				return typeof element.nodeName !== "string" || typeof element.textContent !== "string" || typeof element.removeChild !== "function" || element.attributes !== getAttributes(element) || typeof element.removeAttribute !== "function" || typeof element.setAttribute !== "function" || typeof element.namespaceURI !== "string" || typeof element.insertBefore !== "function" || typeof element.hasChildNodes !== "function" || element.nodeType !== getNodeType(element) || element.childNodes !== getChildNodes(element);
			};
			/**
			* Checks whether the given value is a DocumentFragment from any realm.
			*
			* The realm-independent replacement reads `nodeType` through the cached
			* Node.prototype getter and compares to the DOCUMENT_FRAGMENT_NODE
			* constant (11). nodeType is a numeric value resolved from the node's
			* internal slot, identical across realms for the same kind of node.
			*
			* @param value object to check
			* @return true if value is a DocumentFragment-shaped node from any realm
			*/
			const _isDocumentFragment = function _isDocumentFragment(value) {
				if (!getNodeType || typeof value !== "object" || value === null) return false;
				try {
					return getNodeType(value) === NODE_TYPE.documentFragment;
				} catch (_) {
					return false;
				}
			};
			/**
			* Checks whether the given object is a DOM node, including nodes that
			* originate from a different window/realm (e.g. an iframe's
			* contentDocument). The previous `value instanceof Node` check was
			* realm-bound: nodes from a different window failed it, causing
			* sanitize() to silently stringify them and reset IN_PLACE to false,
			* returning the original node unsanitized. See GHSA-4w3q-35jp-p934.
			*
			* @param value object to check whether it's a DOM node
			* @return true if value is a DOM node from any realm
			*/
			const _isNode = function _isNode(value) {
				if (!getNodeType || typeof value !== "object" || value === null) return false;
				try {
					return typeof getNodeType(value) === "number";
				} catch (_) {
					return false;
				}
			};
			function _executeHooks(hooks, currentNode, data) {
				if (hooks.length === 0) return;
				arrayForEach(hooks, (hook) => {
					hook.call(DOMPurify, currentNode, data, CONFIG);
				});
			}
			/**
			* Structural-threat checks that condemn a node regardless of the
			* allowlists: mXSS via namespace confusion, risky CSS construction,
			* processing instructions, markup-bearing comments. Pure predicate;
			* the caller removes. Check order is load-bearing.
			*
			* @param currentNode the node to inspect
			* @param tagName the node's transformCaseFunc'd tag name
			* @return true if the node must be removed
			*/
			const _isUnsafeNode = function _isUnsafeNode(currentNode, tagName) {
				if (SAFE_FOR_XML && currentNode.hasChildNodes() && !_isNode(currentNode.firstElementChild) && regExpTest(ELEMENT_MARKUP_PROBE, currentNode.textContent) && regExpTest(ELEMENT_MARKUP_PROBE, currentNode.innerHTML)) return true;
				if (SAFE_FOR_XML && currentNode.namespaceURI === HTML_NAMESPACE && LITERAL_TEXT_ELEMENTS[tagName] && (_isNode(currentNode.firstElementChild) || typeof currentNode.textContent === "string" && regExpTest(LITERAL_TEXT_CLOSE[tagName], currentNode.textContent))) return true;
				if (currentNode.nodeType === NODE_TYPE.processingInstruction) return true;
				if (SAFE_FOR_XML && currentNode.nodeType === NODE_TYPE.comment && regExpTest(COMMENT_MARKUP_PROBE, currentNode.data)) return true;
				return false;
			};
			/**
			* Evaluate a CUSTOM_ELEMENT_HANDLING check (a RegExp or a predicate
			* function, per the validation in _parseConfig) against a name.
			* Additional arguments are forwarded to predicate functions - the
			* attributeNameCheck predicate receives the tag name as its second
			* argument. A null/absent check never matches.
			*
			* @param check the configured tagNameCheck / attributeNameCheck value
			* @param name the name to test
			* @param args extra arguments forwarded to a predicate function
			* @return true if the check matches the name
			*/
			const _matchesNameCheck = function _matchesNameCheck(check, name) {
				if (check instanceof RegExp) return regExpTest(check, name);
				if (check instanceof Function) {
					for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) args[_key - 2] = arguments[_key];
					return Boolean(check(name, ...args));
				}
				return false;
			};
			/**
			* Handle a node whose tag is forbidden or not allowlisted: keep
			* allowed custom elements (false return exits _sanitizeElements
			* early - the namespace and fallback-tag removal checks are
			* intentionally skipped for kept custom elements), else hoist
			* content per KEEP_CONTENT and remove.
			*
			* A kept custom element is the ONLY case in which this function
			* returns false, so the caller uses that return value to run the
			* afterSanitizeElements hook on the kept element and keep the
			* element-hook lifecycle consistent with normal allowlisted
			* elements (GHSA-c2j3-45gr-mqc4).
			*
			* @param currentNode the disallowed node
			* @param tagName the node's transformCaseFunc'd tag name
			* @return true if the node was removed, false if kept
			*/
			const _sanitizeDisallowedNode = function _sanitizeDisallowedNode(currentNode, tagName, root) {
				if (!FORBID_TAGS[tagName] && _isBasicCustomElement(tagName) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, tagName)) return false;
				if (KEEP_CONTENT && !FORBID_CONTENTS[tagName]) {
					const parentNode = getParentNode(currentNode);
					const childNodes = getChildNodes(currentNode);
					if (childNodes && parentNode) {
						const childCount = childNodes.length;
						for (let i = childCount - 1; i >= 0; --i) {
							const hoisted = currentNode === root ? cloneNode(childNodes[i], true) : childNodes[i];
							parentNode.insertBefore(hoisted, getNextSibling(currentNode));
						}
					}
				}
				_forceRemove(currentNode);
				return true;
			};
			/**
			* Fork a hook-mutable allowlist off its shared binding the first time a
			* (possibly lazily-installed) uponSanitize* hook is about to see it, so the
			* hook cannot widen the per-instance default or the setConfig binding by
			* reference and leak past the call. Returns the set unchanged once it is
			* already call-local, so repeated calls across elements are idempotent.
			*
			* @param hookList the uponSanitize* hook array for this event
			* @param set the current ALLOWED_TAGS / ALLOWED_ATTR binding
			* @param defaultSet the per-instance DEFAULT_ALLOWED_* constant
			* @param setConfigSet the captured setConfig() binding, or null
			* @return a call-local clone if a hook is present and set is still shared,
			*   else set unchanged
			*/
			const _forkSharedAllowlist = function _forkSharedAllowlist(hookList, set, defaultSet, setConfigSet) {
				if (hookList.length === 0) return set;
				return set === defaultSet || set === setConfigSet ? clone(set) : set;
			};
			/**
			* Shared guard for a node that a hook has detached from the walk tree,
			* used after each element-hook site in _sanitizeElements. Detaching is a
			* long-standing user pattern (issue #469; draw.io-style foreignObject
			* filtering). Per the cached, unclobberable parentNode getter the node is
			* genuinely out of the tree, so it can reach neither the serialized
			* output nor an IN_PLACE live tree; treat it as removed and stop
			* processing it. Without this guard, the unsafe-node / namespace checks
			* would call _forceRemove on a parentless node and hit the REPORT-3
			* fail-closed throw — which exists for nodes DOMPurify wants gone but
			* *cannot* detach (clobbered / parentless roots), the opposite of a node
			* that is already safely gone. The walk root is exempt: a detached
			* IN_PLACE root is legitimate input and must still be fully sanitized,
			* and a kill-decision on it must keep hitting the REPORT-3 throw.
			*
			* Nodes detached by hooks stay the hook's responsibility for placement:
			* they are not recorded in DOMPurify.removed, so the post-walk IN_PLACE
			* pass (which iterates DOMPurify.removed) does not reach them. But a
			* hook-detached subtree can still hold a queued resource-event handler -
			* e.g. an <img onload> that began loading when the caller built the live
			* tree - which fires in page scope after sanitize returns even though the
			* handler never reached the returned tree. That is the audit-5 F1 hazard,
			* and the documented node.remove() hook pattern walks straight into it.
			* So on the IN_PLACE path we neutralize the detached subtree inline,
			* stripping its non-allow-listed attributes before returning, exactly as
			* the post-walk pass does for _forceRemove'd subtrees.
			*
			* @param currentNode the node a hook may have detached
			* @param root the current walk root
			* @return true if the node is detached and now handled, false otherwise
			*/
			const _handleHookDetachedNode = function _handleHookDetachedNode(currentNode, root) {
				if (currentNode === root || getParentNode(currentNode) !== null) return false;
				if (IN_PLACE) _neutralizeSubtree(currentNode);
				return true;
			};
			/**
			* _sanitizeElements
			*
			* @protect nodeName
			* @protect textContent
			* @protect removeChild
			* @param currentNode to check for permission to exist
			* @return true if node was killed, false if left alive
			*/
			const _sanitizeElements = function _sanitizeElements(currentNode, root) {
				_executeHooks(hooks.beforeSanitizeElements, currentNode, null);
				if (_handleHookDetachedNode(currentNode, root)) return true;
				if (_isClobbered(currentNode)) {
					_forceRemove(currentNode);
					return true;
				}
				const tagName = transformCaseFunc(_readNodeName(currentNode));
				ALLOWED_TAGS = _forkSharedAllowlist(hooks.uponSanitizeElement, ALLOWED_TAGS, DEFAULT_ALLOWED_TAGS, SET_CONFIG_ALLOWED_TAGS);
				_executeHooks(hooks.uponSanitizeElement, currentNode, {
					tagName,
					allowedTags: ALLOWED_TAGS
				});
				if (_handleHookDetachedNode(currentNode, root)) return true;
				if (_isUnsafeNode(currentNode, tagName)) {
					_forceRemove(currentNode);
					return true;
				}
				if (FORBID_TAGS[tagName] || !(EXTRA_ELEMENT_HANDLING.tagCheck instanceof Function && EXTRA_ELEMENT_HANDLING.tagCheck(tagName)) && !ALLOWED_TAGS[tagName]) {
					const removed = _sanitizeDisallowedNode(currentNode, tagName, root);
					if (removed === false) _executeHooks(hooks.afterSanitizeElements, currentNode, null);
					return removed;
				}
				if (_readNodeType(currentNode) === NODE_TYPE.element && !_checkValidNamespace(currentNode)) {
					_forceRemove(currentNode);
					return true;
				}
				if ((tagName === "noscript" || tagName === "noembed" || tagName === "noframes") && regExpTest(FALLBACK_TAG_CLOSE, currentNode.innerHTML)) {
					_forceRemove(currentNode);
					return true;
				}
				if (SAFE_FOR_TEMPLATES && currentNode.nodeType === NODE_TYPE.text) {
					const content = _stripTemplateExpressions(currentNode.textContent);
					if (currentNode.textContent !== content) {
						arrayPush(DOMPurify.removed, { element: currentNode.cloneNode() });
						currentNode.textContent = content;
					}
				}
				_executeHooks(hooks.afterSanitizeElements, currentNode, null);
				return false;
			};
			/**
			* _isValidAttribute
			*
			* @param lcTag Lowercase tag name of containing element.
			* @param lcName Lowercase attribute name.
			* @param value Attribute value.
			* @return Returns true if `value` is valid, otherwise false.
			*/
			const _isValidAttribute = function _isValidAttribute(lcTag, lcName, value) {
				if (FORBID_ATTR[lcName]) return false;
				if (_isPatchLinkageAttribute(lcName, lcTag)) return false;
				if (SANITIZE_DOM && (lcName === "id" || lcName === "name") && (value in document || value in formElement)) return false;
				const nameIsPermitted = ALLOWED_ATTR[lcName] || EXTRA_ELEMENT_HANDLING.attributeCheck instanceof Function && EXTRA_ELEMENT_HANDLING.attributeCheck(lcName, lcTag);
				if (ALLOW_DATA_ATTR && regExpTest(DATA_ATTR$1, lcName)) return true;
				if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR$1, lcName)) return true;
				if (!nameIsPermitted) return _isBasicCustomElement(lcTag) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, lcTag) && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.attributeNameCheck, lcName, lcTag) || lcName === "is" && CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements && _matchesNameCheck(CUSTOM_ELEMENT_HANDLING.tagNameCheck, value);
				if (URI_SAFE_ATTRIBUTES[lcName]) return true;
				if (regExpTest(IS_ALLOWED_URI$1, stringReplace(value, ATTR_WHITESPACE$1, ""))) return true;
				if ((lcName === "src" || lcName === "xlink:href" || lcName === "href") && lcTag !== "script" && stringIndexOf(value, "data:") === 0 && DATA_URI_TAGS[lcTag]) return true;
				if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA$1, stringReplace(value, ATTR_WHITESPACE$1, ""))) return true;
				return !value;
			};
			const RESERVED_CUSTOM_ELEMENT_NAMES = addToSet({}, [
				"annotation-xml",
				"color-profile",
				"font-face",
				"font-face-format",
				"font-face-name",
				"font-face-src",
				"font-face-uri",
				"missing-glyph"
			]);
			/**
			* _isBasicCustomElement
			* checks if at least one dash is included in tagName, and it's not the first char
			* for more sophisticated checking see https://github.com/sindresorhus/validate-element-name
			*
			* @param tagName name of the tag of the node to sanitize
			* @returns Returns true if the tag name meets the basic criteria for a custom element, otherwise false.
			*/
			const _isBasicCustomElement = function _isBasicCustomElement(tagName) {
				return !RESERVED_CUSTOM_ELEMENT_NAMES[stringToLowerCase(tagName)] && regExpTest(CUSTOM_ELEMENT$1, tagName);
			};
			/**
			* Wrap an attribute value in the matching Trusted Types object when
			* the active policy requires it. Namespaced attributes pass through
			* unchanged (no TT support yet, see
			* https://bugs.chromium.org/p/chromium/issues/detail?id=1305293).
			*
			* @param lcTag lowercase tag name of the containing element
			* @param lcName lowercase attribute name
			* @param namespaceURI the attribute's namespace, if any
			* @param value the attribute value to wrap
			* @return the value, wrapped when Trusted Types demand it
			*/
			const _applyTrustedTypesToAttribute = function _applyTrustedTypesToAttribute(lcTag, lcName, namespaceURI, value) {
				if (trustedTypesPolicy && typeof trustedTypes === "object" && typeof trustedTypes.getAttributeType === "function" && !namespaceURI) switch (trustedTypes.getAttributeType(lcTag, lcName)) {
					case "TrustedHTML": return _createTrustedHTML(value);
					case "TrustedScriptURL": return _createTrustedScriptURL(value);
				}
				return value;
			};
			/**
			* Write a modified attribute value back onto the element. On
			* success, re-probe for clobbering introduced by the new value and
			* remove the element when found; otherwise pop the removal entry
			* recorded by the earlier _removeAttribute (long-standing pairing
			* with the SANITIZE_NAMED_PROPS path - do not "fix" casually). On
			* failure, remove the attribute instead.
			*
			* @param currentNode the element carrying the attribute
			* @param name the attribute name as present on the element
			* @param namespaceURI the attribute's namespace, if any
			* @param value the new attribute value
			*/
			const _setAttributeValue = function _setAttributeValue(currentNode, name, namespaceURI, value) {
				try {
					if (namespaceURI) currentNode.setAttributeNS(namespaceURI, name, value);
					else currentNode.setAttribute(name, value);
					if (_isClobbered(currentNode)) _forceRemove(currentNode);
					else arrayPop(DOMPurify.removed);
				} catch (_) {
					_removeAttribute(name, currentNode);
				}
			};
			/**
			* _sanitizeAttributes
			*
			* @protect attributes
			* @protect nodeName
			* @protect removeAttribute
			* @protect setAttribute
			*
			* @param currentNode to sanitize
			*/
			const _sanitizeAttributes = function _sanitizeAttributes(currentNode) {
				_executeHooks(hooks.beforeSanitizeAttributes, currentNode, null);
				const attributes = currentNode.attributes;
				if (!attributes || _isClobbered(currentNode)) return;
				ALLOWED_ATTR = _forkSharedAllowlist(hooks.uponSanitizeAttribute, ALLOWED_ATTR, DEFAULT_ALLOWED_ATTR, SET_CONFIG_ALLOWED_ATTR);
				const hookEvent = {
					attrName: "",
					attrValue: "",
					keepAttr: true,
					allowedAttributes: ALLOWED_ATTR,
					forceKeepAttr: void 0
				};
				let l = attributes.length;
				const lcTag = transformCaseFunc(currentNode.nodeName);
				while (l--) {
					const attr = attributes[l];
					const name = attr.name, namespaceURI = attr.namespaceURI, attrValue = attr.value;
					const lcName = transformCaseFunc(name);
					const initValue = attrValue;
					let value = name === "value" ? initValue : stringTrim(initValue);
					hookEvent.attrName = lcName;
					hookEvent.attrValue = value;
					hookEvent.keepAttr = true;
					hookEvent.forceKeepAttr = void 0;
					_executeHooks(hooks.uponSanitizeAttribute, currentNode, hookEvent);
					value = hookEvent.attrValue;
					if (SANITIZE_NAMED_PROPS && (lcName === "id" || lcName === "name") && stringIndexOf(value, SANITIZE_NAMED_PROPS_PREFIX) !== 0) {
						_removeAttribute(name, currentNode, attr);
						value = SANITIZE_NAMED_PROPS_PREFIX + value;
					}
					if (SAFE_FOR_XML && regExpTest(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i, value)) {
						_removeAttribute(name, currentNode, attr);
						continue;
					}
					if (lcName === "attributename" && stringMatch(value, "href")) {
						_removeAttribute(name, currentNode, attr);
						continue;
					}
					if (hookEvent.forceKeepAttr) continue;
					if (!hookEvent.keepAttr) {
						_removeAttribute(name, currentNode, attr);
						continue;
					}
					if (!ALLOW_SELF_CLOSE_IN_ATTR && regExpTest(SELF_CLOSING_TAG, value)) {
						_removeAttribute(name, currentNode, attr);
						continue;
					}
					if (SAFE_FOR_TEMPLATES) value = _stripTemplateExpressions(value);
					if (!_isValidAttribute(lcTag, lcName, value)) {
						_removeAttribute(name, currentNode, attr);
						continue;
					}
					value = _applyTrustedTypesToAttribute(lcTag, lcName, namespaceURI, value);
					if (value !== initValue) _setAttributeValue(currentNode, name, namespaceURI, value);
				}
				_executeHooks(hooks.afterSanitizeAttributes, currentNode, null);
			};
			/**
			* _sanitizeShadowDOM
			*
			* @param fragment to iterate over recursively
			*/
			const _sanitizeShadowDOM2 = function _sanitizeShadowDOM(fragment) {
				let shadowNode = null;
				const shadowIterator = _createNodeIterator(fragment);
				_executeHooks(hooks.beforeSanitizeShadowDOM, fragment, null);
				while (shadowNode = shadowIterator.nextNode()) {
					_executeHooks(hooks.uponSanitizeShadowNode, shadowNode, null);
					_sanitizeElements(shadowNode, fragment);
					_sanitizeAttributes(shadowNode);
					if (_isDocumentFragment(shadowNode.content)) _sanitizeShadowDOM2(shadowNode.content);
					if (_readNodeType(shadowNode) === NODE_TYPE.element) {
						const innerSr = getShadowRoot(shadowNode);
						if (_isDocumentFragment(innerSr)) {
							_sanitizeAttachedShadowRoots(innerSr);
							_sanitizeShadowDOM2(innerSr);
						}
					}
				}
				_executeHooks(hooks.afterSanitizeShadowDOM, fragment, null);
			};
			/**
			* _sanitizeAttachedShadowRoots
			*
			* Walks `root` and feeds every attached shadow root we encounter into
			* the existing _sanitizeShadowDOM pipeline. The default node iterator
			* does not descend into shadow trees, so nodes inside an attached
			* shadow root would otherwise be skipped entirely.
			*
			* Two real input paths put attached shadow roots in front of us:
			*   1. IN_PLACE on a DOM node that already has shadow roots attached.
			*   2. DOM-node input where importNode(dirty, true) deep-clones the
			*      shadow root because it was created with `clonable: true`.
			*
			* This pass runs once, up front, so the main iteration loop (and the
			* existing _sanitizeShadowDOM template-content recursion) stay
			* untouched — string-input paths are not affected.
			*
			* @param root the subtree root to walk for attached shadow roots
			*/
			const _sanitizeAttachedShadowRoots = function _sanitizeAttachedShadowRoots(root) {
				const stack = [{
					node: root,
					shadow: null
				}];
				while (stack.length > 0) {
					const item = stack.pop();
					if (item.shadow) {
						_sanitizeShadowDOM2(item.shadow);
						continue;
					}
					const node = item.node;
					const isElement = _readNodeType(node) === NODE_TYPE.element;
					const childNodes = getChildNodes(node);
					if (childNodes) for (let i = childNodes.length - 1; i >= 0; --i) stack.push({
						node: childNodes[i],
						shadow: null
					});
					if (isElement) {
						const rootName = getNodeName ? getNodeName(node) : null;
						if (typeof rootName === "string" && transformCaseFunc(rootName) === "template") {
							const content = node.content;
							if (_isDocumentFragment(content)) stack.push({
								node: content,
								shadow: null
							});
						}
					}
					if (isElement) {
						const sr = getShadowRoot(node);
						if (_isDocumentFragment(sr)) stack.push({
							node: null,
							shadow: sr
						}, {
							node: sr,
							shadow: null
						});
					}
				}
			};
			DOMPurify.sanitize = function(dirty) {
				let cfg = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
				let body = null;
				let importedNode = null;
				let currentNode = null;
				let returnNode = null;
				IS_EMPTY_INPUT = !dirty;
				if (IS_EMPTY_INPUT) dirty = "<!-->";
				if (typeof dirty !== "string" && !_isNode(dirty)) {
					dirty = stringifyValue(dirty);
					if (typeof dirty !== "string") throw typeErrorCreate("dirty is not a string, aborting");
				}
				if (!DOMPurify.isSupported) return dirty;
				if (SET_CONFIG) {
					ALLOWED_TAGS = SET_CONFIG_ALLOWED_TAGS;
					ALLOWED_ATTR = SET_CONFIG_ALLOWED_ATTR;
				} else _parseConfig(cfg);
				if (hooks.uponSanitizeElement.length > 0 || hooks.uponSanitizeAttribute.length > 0) ALLOWED_TAGS = clone(ALLOWED_TAGS);
				if (hooks.uponSanitizeAttribute.length > 0) ALLOWED_ATTR = clone(ALLOWED_ATTR);
				DOMPurify.removed = [];
				const inPlace = IN_PLACE && typeof dirty !== "string" && _isNode(dirty);
				if (inPlace) {
					_neutralizePatchLinkage(dirty);
					const nn = _readNodeName(dirty);
					if (typeof nn === "string") {
						const tagName = transformCaseFunc(nn);
						if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
							_neutralizeRoot(dirty);
							throw typeErrorCreate("root node is forbidden and cannot be sanitized in-place");
						}
					}
					if (_isClobbered(dirty)) {
						_neutralizeRoot(dirty);
						throw typeErrorCreate("root node is clobbered and cannot be sanitized in-place");
					}
					try {
						_sanitizeAttachedShadowRoots(dirty);
					} catch (error) {
						_neutralizeRoot(dirty);
						throw error;
					}
				} else if (_isNode(dirty)) {
					body = _initDocument("<!---->");
					importedNode = body.ownerDocument.importNode(dirty, true);
					if (importedNode.nodeType === NODE_TYPE.element && importedNode.nodeName === "BODY") body = importedNode;
					else if (importedNode.nodeName === "HTML") body = importedNode;
					else body.appendChild(importedNode);
					_sanitizeAttachedShadowRoots(importedNode);
				} else {
					if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT && dirty.indexOf("<") === -1) return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? _createTrustedHTML(dirty) : dirty;
					body = _initDocument(dirty);
					if (!body) return RETURN_DOM ? null : RETURN_TRUSTED_TYPE ? emptyHTML : "";
				}
				if (body && FORCE_BODY) _forceRemove(body.firstChild);
				const walkRoot = inPlace ? dirty : body;
				try {
					const nodeIterator = _createNodeIterator(walkRoot);
					while (currentNode = nodeIterator.nextNode()) {
						_sanitizeElements(currentNode, walkRoot);
						_sanitizeAttributes(currentNode);
						if (_isDocumentFragment(currentNode.content)) _sanitizeShadowDOM2(currentNode.content);
					}
				} catch (error) {
					if (inPlace) {
						_neutralizeRoot(dirty);
						arrayForEach(DOMPurify.removed, (entry) => {
							if (entry.element) _neutralizeSubtree(entry.element);
						});
					}
					throw error;
				}
				if (inPlace) {
					arrayForEach(DOMPurify.removed, (entry) => {
						if (entry.element) _neutralizeSubtree(entry.element);
					});
					if (SAFE_FOR_TEMPLATES) _scrubTemplateExpressions2(dirty);
					return dirty;
				}
				if (RETURN_DOM) {
					if (SAFE_FOR_TEMPLATES) _scrubTemplateExpressions2(body);
					if (RETURN_DOM_FRAGMENT) {
						returnNode = createDocumentFragment.call(body.ownerDocument);
						while (body.firstChild) returnNode.appendChild(body.firstChild);
					} else returnNode = body;
					if (ALLOWED_ATTR.shadowroot || ALLOWED_ATTR.shadowrootmode) returnNode = importNode.call(originalDocument, returnNode, true);
					return returnNode;
				}
				let serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;
				if (WHOLE_DOCUMENT && ALLOWED_TAGS["!doctype"] && body.ownerDocument && body.ownerDocument.doctype && body.ownerDocument.doctype.name && regExpTest(DOCTYPE_NAME, body.ownerDocument.doctype.name)) serializedHTML = "<!DOCTYPE " + body.ownerDocument.doctype.name + ">\n" + serializedHTML;
				if (SAFE_FOR_TEMPLATES) serializedHTML = _stripTemplateExpressions(serializedHTML);
				return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? _createTrustedHTML(serializedHTML) : serializedHTML;
			};
			DOMPurify.setConfig = function() {
				let cfg = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
				_parseConfig(cfg);
				SET_CONFIG = true;
				SET_CONFIG_ALLOWED_TAGS = ALLOWED_TAGS;
				SET_CONFIG_ALLOWED_ATTR = ALLOWED_ATTR;
			};
			DOMPurify.clearConfig = function() {
				CONFIG = null;
				SET_CONFIG = false;
				SET_CONFIG_ALLOWED_TAGS = null;
				SET_CONFIG_ALLOWED_ATTR = null;
				trustedTypesPolicy = defaultTrustedTypesPolicy;
				emptyHTML = "";
			};
			DOMPurify.isValidAttribute = function(tag, attr, value) {
				if (!CONFIG) _parseConfig({});
				const lcTag = transformCaseFunc(tag);
				const lcName = transformCaseFunc(attr);
				return _isValidAttribute(lcTag, lcName, value);
			};
			DOMPurify.addHook = function(entryPoint, hookFunction) {
				if (typeof hookFunction !== "function") return;
				if (!objectHasOwnProperty(hooks, entryPoint)) return;
				arrayPush(hooks[entryPoint], hookFunction);
			};
			DOMPurify.removeHook = function(entryPoint, hookFunction) {
				if (!objectHasOwnProperty(hooks, entryPoint)) return;
				if (hookFunction !== void 0) {
					const index = arrayLastIndexOf(hooks[entryPoint], hookFunction);
					return index === -1 ? void 0 : arraySplice(hooks[entryPoint], index, 1)[0];
				}
				return arrayPop(hooks[entryPoint]);
			};
			DOMPurify.removeHooks = function(entryPoint) {
				if (!objectHasOwnProperty(hooks, entryPoint)) return;
				hooks[entryPoint] = [];
			};
			DOMPurify.removeAllHooks = function() {
				hooks = _createHooksMap();
			};
			return DOMPurify;
		}
		var purify = createDOMPurify();
		//#endregion
		//#region node_modules/.pnpm/marked@16.4.2/node_modules/marked/lib/marked.esm.js
		/**
		* marked v16.4.2 - a markdown parser
		* Copyright (c) 2018-2025, MarkedJS. (MIT License)
		* Copyright (c) 2011-2018, Christopher Jeffrey. (MIT License)
		* https://github.com/markedjs/marked
		*/
		/**
		* DO NOT EDIT THIS FILE
		* The code in this file is generated from files in ./src/
		*/
		function L() {
			return {
				async: !1,
				breaks: !1,
				extensions: null,
				gfm: !0,
				hooks: null,
				pedantic: !1,
				renderer: null,
				silent: !1,
				tokenizer: null,
				walkTokens: null
			};
		}
		var T = L();
		function G(l) {
			T = l;
		}
		var E = { exec: () => null };
		function d(l, e = "") {
			let t = typeof l == "string" ? l : l.source, n = {
				replace: (r, i) => {
					let s = typeof i == "string" ? i : i.source;
					return s = s.replace(m.caret, "$1"), t = t.replace(r, s), n;
				},
				getRegex: () => new RegExp(t, e)
			};
			return n;
		}
		var be = (() => {
			try {
				return true;
			} catch {
				return !1;
			}
		})();
		var m = {
			codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm,
			outputLinkReplace: /\\([\[\]])/g,
			indentCodeCompensation: /^(\s+)(?:```)/,
			beginningSpace: /^\s+/,
			endingHash: /#$/,
			startingSpaceChar: /^ /,
			endingSpaceChar: / $/,
			nonSpaceChar: /[^ ]/,
			newLineCharGlobal: /\n/g,
			tabCharGlobal: /\t/g,
			multipleSpaceGlobal: /\s+/g,
			blankLine: /^[ \t]*$/,
			doubleBlankLine: /\n[ \t]*\n[ \t]*$/,
			blockquoteStart: /^ {0,3}>/,
			blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g,
			blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm,
			listReplaceTabs: /^\t+/,
			listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g,
			listIsTask: /^\[[ xX]\] /,
			listReplaceTask: /^\[[ xX]\] +/,
			anyLine: /\n.*\n/,
			hrefBrackets: /^<(.*)>$/,
			tableDelimiter: /[:|]/,
			tableAlignChars: /^\||\| *$/g,
			tableRowBlankLine: /\n[ \t]*$/,
			tableAlignRight: /^ *-+: *$/,
			tableAlignCenter: /^ *:-+: *$/,
			tableAlignLeft: /^ *:-+ *$/,
			startATag: /^<a /i,
			endATag: /^<\/a>/i,
			startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i,
			endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i,
			startAngleBracket: /^</,
			endAngleBracket: />$/,
			pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/,
			unicodeAlphaNumeric: /[\p{L}\p{N}]/u,
			escapeTest: /[&<>"']/,
			escapeReplace: /[&<>"']/g,
			escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,
			escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,
			unescapeTest: /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/gi,
			caret: /(^|[^\[])\^/g,
			percentDecode: /%25/g,
			findPipe: /\|/g,
			splitPipe: / \|/,
			slashPipe: /\\\|/g,
			carriageReturn: /\r\n|\r/g,
			spaceLine: /^ +$/gm,
			notSpaceStart: /^\S*/,
			endingNewline: /\n$/,
			listItemRegex: (l) => new RegExp(`^( {0,3}${l})((?:[	 ][^\\n]*)?(?:\\n|$))`),
			nextBulletRegex: (l) => new RegExp(`^ {0,${Math.min(3, l - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),
			hrRegex: (l) => new RegExp(`^ {0,${Math.min(3, l - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),
			fencesBeginRegex: (l) => new RegExp(`^ {0,${Math.min(3, l - 1)}}(?:\`\`\`|~~~)`),
			headingBeginRegex: (l) => new RegExp(`^ {0,${Math.min(3, l - 1)}}#`),
			htmlBeginRegex: (l) => new RegExp(`^ {0,${Math.min(3, l - 1)}}<(?:[a-z].*>|!--)`, "i")
		};
		var Re = /^(?:[ \t]*(?:\n|$))+/;
		var Te = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
		var Oe = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
		var I = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
		var we = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
		var F = /(?:[*+-]|\d{1,9}[.)])/;
		var ie = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/;
		var oe = d(ie).replace(/bull/g, F).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex();
		var ye = d(ie).replace(/bull/g, F).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex();
		var j = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/;
		var Pe = /^[^\n]+/;
		var Q = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/;
		var Se = d(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", Q).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
		var $e = d(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, F).getRegex();
		var v = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
		var U = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
		var _e = d("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", U).replace("tag", v).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
		var ae = d(j).replace("hr", I).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v).getRegex();
		var K = {
			blockquote: d(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", ae).getRegex(),
			code: Te,
			def: Se,
			fences: Oe,
			heading: we,
			hr: I,
			html: _e,
			lheading: oe,
			list: $e,
			newline: Re,
			paragraph: ae,
			table: E,
			text: Pe
		};
		var re = d("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", I).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v).getRegex();
		var Me = {
			...K,
			lheading: ye,
			table: re,
			paragraph: d(j).replace("hr", I).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", re).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)]) ").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", v).getRegex()
		};
		var ze = {
			...K,
			html: d(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", U).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),
			def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
			heading: /^(#{1,6})(.*)(?:\n+|$)/,
			fences: E,
			lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
			paragraph: d(j).replace("hr", I).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", oe).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex()
		};
		var Ae = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
		var Ee = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
		var le = /^( {2,}|\\)\n(?!\s*$)/;
		var Ie = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
		var D = /[\p{P}\p{S}]/u;
		var W = /[\s\p{P}\p{S}]/u;
		var ue = /[^\s\p{P}\p{S}]/u;
		var Ce = d(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, W).getRegex();
		var pe = /(?!~)[\p{P}\p{S}]/u;
		var Be = /(?!~)[\s\p{P}\p{S}]/u;
		var qe = /(?:[^\s\p{P}\p{S}]|~)/u;
		var ve = d(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", be ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex();
		var ce = /^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/;
		var De = d(ce, "u").replace(/punct/g, D).getRegex();
		var He = d(ce, "u").replace(/punct/g, pe).getRegex();
		var he = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)";
		var Ze = d(he, "gu").replace(/notPunctSpace/g, ue).replace(/punctSpace/g, W).replace(/punct/g, D).getRegex();
		var Ge = d(he, "gu").replace(/notPunctSpace/g, qe).replace(/punctSpace/g, Be).replace(/punct/g, pe).getRegex();
		var Ne = d("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, ue).replace(/punctSpace/g, W).replace(/punct/g, D).getRegex();
		var Fe = d(/\\(punct)/, "gu").replace(/punct/g, D).getRegex();
		var je = d(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
		var Qe = d(U).replace("(?:-->|$)", "-->").getRegex();
		var Ue = d("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", Qe).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
		var q = /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+[^`]*?`+(?!`)|[^\[\]\\`])*?/;
		var Ke = d(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]*(?:\n[ \t]*)?)(title))?\s*\)/).replace("label", q).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
		var de = d(/^!?\[(label)\]\[(ref)\]/).replace("label", q).replace("ref", Q).getRegex();
		var ke = d(/^!?\[(ref)\](?:\[\])?/).replace("ref", Q).getRegex();
		var We = d("reflink|nolink(?!\\()", "g").replace("reflink", de).replace("nolink", ke).getRegex();
		var se = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/;
		var X = {
			_backpedal: E,
			anyPunctuation: Fe,
			autolink: je,
			blockSkip: ve,
			br: le,
			code: Ee,
			del: E,
			emStrongLDelim: De,
			emStrongRDelimAst: Ze,
			emStrongRDelimUnd: Ne,
			escape: Ae,
			link: Ke,
			nolink: ke,
			punctuation: Ce,
			reflink: de,
			reflinkSearch: We,
			tag: Ue,
			text: Ie,
			url: E
		};
		var Xe = {
			...X,
			link: d(/^!?\[(label)\]\((.*?)\)/).replace("label", q).getRegex(),
			reflink: d(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", q).getRegex()
		};
		var N = {
			...X,
			emStrongRDelimAst: Ge,
			emStrongLDelim: He,
			url: d(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol", se).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),
			_backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
			del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,
			text: d(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol", se).getRegex()
		};
		var Je = {
			...N,
			br: d(le).replace("{2,}", "*").getRegex(),
			text: d(N.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex()
		};
		var C = {
			normal: K,
			gfm: Me,
			pedantic: ze
		};
		var M = {
			normal: X,
			gfm: N,
			breaks: Je,
			pedantic: Xe
		};
		var Ve = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			"\"": "&quot;",
			"'": "&#39;"
		};
		var ge = (l) => Ve[l];
		function w(l, e) {
			if (e) {
				if (m.escapeTest.test(l)) return l.replace(m.escapeReplace, ge);
			} else if (m.escapeTestNoEncode.test(l)) return l.replace(m.escapeReplaceNoEncode, ge);
			return l;
		}
		function J(l) {
			try {
				l = encodeURI(l).replace(m.percentDecode, "%");
			} catch {
				return null;
			}
			return l;
		}
		function V(l, e) {
			let n = l.replace(m.findPipe, (i, s, a) => {
				let o = !1, p = s;
				for (; --p >= 0 && a[p] === "\\";) o = !o;
				return o ? "|" : " |";
			}).split(m.splitPipe), r = 0;
			if (n[0].trim() || n.shift(), n.length > 0 && !n.at(-1)?.trim() && n.pop(), e) if (n.length > e) n.splice(e);
			else for (; n.length < e;) n.push("");
			for (; r < n.length; r++) n[r] = n[r].trim().replace(m.slashPipe, "|");
			return n;
		}
		function z(l, e, t) {
			let n = l.length;
			if (n === 0) return "";
			let r = 0;
			for (; r < n;) {
				let i = l.charAt(n - r - 1);
				if (i === e && !t) r++;
				else if (i !== e && t) r++;
				else break;
			}
			return l.slice(0, n - r);
		}
		function fe(l, e) {
			if (l.indexOf(e[1]) === -1) return -1;
			let t = 0;
			for (let n = 0; n < l.length; n++) if (l[n] === "\\") n++;
			else if (l[n] === e[0]) t++;
			else if (l[n] === e[1] && (t--, t < 0)) return n;
			return t > 0 ? -2 : -1;
		}
		function me(l, e, t, n, r) {
			let i = e.href, s = e.title || null, a = l[1].replace(r.other.outputLinkReplace, "$1");
			n.state.inLink = !0;
			let o = {
				type: l[0].charAt(0) === "!" ? "image" : "link",
				raw: t,
				href: i,
				title: s,
				text: a,
				tokens: n.inlineTokens(a)
			};
			return n.state.inLink = !1, o;
		}
		function Ye(l, e, t) {
			let n = l.match(t.other.indentCodeCompensation);
			if (n === null) return e;
			let r = n[1];
			return e.split(`
`).map((i) => {
				let s = i.match(t.other.beginningSpace);
				if (s === null) return i;
				let [a] = s;
				return a.length >= r.length ? i.slice(r.length) : i;
			}).join(`
`);
		}
		var y = class {
			options;
			rules;
			lexer;
			constructor(e) {
				this.options = e || T;
			}
			space(e) {
				let t = this.rules.block.newline.exec(e);
				if (t && t[0].length > 0) return {
					type: "space",
					raw: t[0]
				};
			}
			code(e) {
				let t = this.rules.block.code.exec(e);
				if (t) {
					let n = t[0].replace(this.rules.other.codeRemoveIndent, "");
					return {
						type: "code",
						raw: t[0],
						codeBlockStyle: "indented",
						text: this.options.pedantic ? n : z(n, `
`)
					};
				}
			}
			fences(e) {
				let t = this.rules.block.fences.exec(e);
				if (t) {
					let n = t[0], r = Ye(n, t[3] || "", this.rules);
					return {
						type: "code",
						raw: n,
						lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2],
						text: r
					};
				}
			}
			heading(e) {
				let t = this.rules.block.heading.exec(e);
				if (t) {
					let n = t[2].trim();
					if (this.rules.other.endingHash.test(n)) {
						let r = z(n, "#");
						(this.options.pedantic || !r || this.rules.other.endingSpaceChar.test(r)) && (n = r.trim());
					}
					return {
						type: "heading",
						raw: t[0],
						depth: t[1].length,
						text: n,
						tokens: this.lexer.inline(n)
					};
				}
			}
			hr(e) {
				let t = this.rules.block.hr.exec(e);
				if (t) return {
					type: "hr",
					raw: z(t[0], `
`)
				};
			}
			blockquote(e) {
				let t = this.rules.block.blockquote.exec(e);
				if (t) {
					let n = z(t[0], `
`).split(`
`), r = "", i = "", s = [];
					for (; n.length > 0;) {
						let a = !1, o = [], p;
						for (p = 0; p < n.length; p++) if (this.rules.other.blockquoteStart.test(n[p])) o.push(n[p]), a = !0;
						else if (!a) o.push(n[p]);
						else break;
						n = n.slice(p);
						let u = o.join(`
`), c = u.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
						r = r ? `${r}
${u}` : u, i = i ? `${i}
${c}` : c;
						let g = this.lexer.state.top;
						if (this.lexer.state.top = !0, this.lexer.blockTokens(c, s, !0), this.lexer.state.top = g, n.length === 0) break;
						let h = s.at(-1);
						if (h?.type === "code") break;
						if (h?.type === "blockquote") {
							let R = h, f = R.raw + `
` + n.join(`
`), O = this.blockquote(f);
							s[s.length - 1] = O, r = r.substring(0, r.length - R.raw.length) + O.raw, i = i.substring(0, i.length - R.text.length) + O.text;
							break;
						} else if (h?.type === "list") {
							let R = h, f = R.raw + `
` + n.join(`
`), O = this.list(f);
							s[s.length - 1] = O, r = r.substring(0, r.length - h.raw.length) + O.raw, i = i.substring(0, i.length - R.raw.length) + O.raw, n = f.substring(s.at(-1).raw.length).split(`
`);
							continue;
						}
					}
					return {
						type: "blockquote",
						raw: r,
						tokens: s,
						text: i
					};
				}
			}
			list(e) {
				let t = this.rules.block.list.exec(e);
				if (t) {
					let n = t[1].trim(), r = n.length > 1, i = {
						type: "list",
						raw: "",
						ordered: r,
						start: r ? +n.slice(0, -1) : "",
						loose: !1,
						items: []
					};
					n = r ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = r ? n : "[*+-]");
					let s = this.rules.other.listItemRegex(n), a = !1;
					for (; e;) {
						let p = !1, u = "", c = "";
						if (!(t = s.exec(e)) || this.rules.block.hr.test(e)) break;
						u = t[0], e = e.substring(u.length);
						let g = t[2].split(`
`, 1)[0].replace(this.rules.other.listReplaceTabs, (H) => " ".repeat(3 * H.length)), h = e.split(`
`, 1)[0], R = !g.trim(), f = 0;
						if (this.options.pedantic ? (f = 2, c = g.trimStart()) : R ? f = t[1].length + 1 : (f = t[2].search(this.rules.other.nonSpaceChar), f = f > 4 ? 1 : f, c = g.slice(f), f += t[1].length), R && this.rules.other.blankLine.test(h) && (u += h + `
`, e = e.substring(h.length + 1), p = !0), !p) {
							let H = this.rules.other.nextBulletRegex(f), ee = this.rules.other.hrRegex(f), te = this.rules.other.fencesBeginRegex(f), ne = this.rules.other.headingBeginRegex(f), xe = this.rules.other.htmlBeginRegex(f);
							for (; e;) {
								let Z = e.split(`
`, 1)[0], A;
								if (h = Z, this.options.pedantic ? (h = h.replace(this.rules.other.listReplaceNesting, "  "), A = h) : A = h.replace(this.rules.other.tabCharGlobal, "    "), te.test(h) || ne.test(h) || xe.test(h) || H.test(h) || ee.test(h)) break;
								if (A.search(this.rules.other.nonSpaceChar) >= f || !h.trim()) c += `
` + A.slice(f);
								else {
									if (R || g.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || te.test(g) || ne.test(g) || ee.test(g)) break;
									c += `
` + h;
								}
								!R && !h.trim() && (R = !0), u += Z + `
`, e = e.substring(Z.length + 1), g = A.slice(f);
							}
						}
						i.loose || (a ? i.loose = !0 : this.rules.other.doubleBlankLine.test(u) && (a = !0));
						let O = null, Y;
						this.options.gfm && (O = this.rules.other.listIsTask.exec(c), O && (Y = O[0] !== "[ ] ", c = c.replace(this.rules.other.listReplaceTask, ""))), i.items.push({
							type: "list_item",
							raw: u,
							task: !!O,
							checked: Y,
							loose: !1,
							text: c,
							tokens: []
						}), i.raw += u;
					}
					let o = i.items.at(-1);
					if (o) o.raw = o.raw.trimEnd(), o.text = o.text.trimEnd();
					else return;
					i.raw = i.raw.trimEnd();
					for (let p = 0; p < i.items.length; p++) if (this.lexer.state.top = !1, i.items[p].tokens = this.lexer.blockTokens(i.items[p].text, []), !i.loose) {
						let u = i.items[p].tokens.filter((g) => g.type === "space");
						i.loose = u.length > 0 && u.some((g) => this.rules.other.anyLine.test(g.raw));
					}
					if (i.loose) for (let p = 0; p < i.items.length; p++) i.items[p].loose = !0;
					return i;
				}
			}
			html(e) {
				let t = this.rules.block.html.exec(e);
				if (t) return {
					type: "html",
					block: !0,
					raw: t[0],
					pre: t[1] === "pre" || t[1] === "script" || t[1] === "style",
					text: t[0]
				};
			}
			def(e) {
				let t = this.rules.block.def.exec(e);
				if (t) {
					let n = t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), r = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", i = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
					return {
						type: "def",
						tag: n,
						raw: t[0],
						href: r,
						title: i
					};
				}
			}
			table(e) {
				let t = this.rules.block.table.exec(e);
				if (!t || !this.rules.other.tableDelimiter.test(t[2])) return;
				let n = V(t[1]), r = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), i = t[3]?.trim() ? t[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], s = {
					type: "table",
					raw: t[0],
					header: [],
					align: [],
					rows: []
				};
				if (n.length === r.length) {
					for (let a of r) this.rules.other.tableAlignRight.test(a) ? s.align.push("right") : this.rules.other.tableAlignCenter.test(a) ? s.align.push("center") : this.rules.other.tableAlignLeft.test(a) ? s.align.push("left") : s.align.push(null);
					for (let a = 0; a < n.length; a++) s.header.push({
						text: n[a],
						tokens: this.lexer.inline(n[a]),
						header: !0,
						align: s.align[a]
					});
					for (let a of i) s.rows.push(V(a, s.header.length).map((o, p) => ({
						text: o,
						tokens: this.lexer.inline(o),
						header: !1,
						align: s.align[p]
					})));
					return s;
				}
			}
			lheading(e) {
				let t = this.rules.block.lheading.exec(e);
				if (t) return {
					type: "heading",
					raw: t[0],
					depth: t[2].charAt(0) === "=" ? 1 : 2,
					text: t[1],
					tokens: this.lexer.inline(t[1])
				};
			}
			paragraph(e) {
				let t = this.rules.block.paragraph.exec(e);
				if (t) {
					let n = t[1].charAt(t[1].length - 1) === `
` ? t[1].slice(0, -1) : t[1];
					return {
						type: "paragraph",
						raw: t[0],
						text: n,
						tokens: this.lexer.inline(n)
					};
				}
			}
			text(e) {
				let t = this.rules.block.text.exec(e);
				if (t) return {
					type: "text",
					raw: t[0],
					text: t[0],
					tokens: this.lexer.inline(t[0])
				};
			}
			escape(e) {
				let t = this.rules.inline.escape.exec(e);
				if (t) return {
					type: "escape",
					raw: t[0],
					text: t[1]
				};
			}
			tag(e) {
				let t = this.rules.inline.tag.exec(e);
				if (t) return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = !0 : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = !1), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = !0 : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = !1), {
					type: "html",
					raw: t[0],
					inLink: this.lexer.state.inLink,
					inRawBlock: this.lexer.state.inRawBlock,
					block: !1,
					text: t[0]
				};
			}
			link(e) {
				let t = this.rules.inline.link.exec(e);
				if (t) {
					let n = t[2].trim();
					if (!this.options.pedantic && this.rules.other.startAngleBracket.test(n)) {
						if (!this.rules.other.endAngleBracket.test(n)) return;
						let s = z(n.slice(0, -1), "\\");
						if ((n.length - s.length) % 2 === 0) return;
					} else {
						let s = fe(t[2], "()");
						if (s === -2) return;
						if (s > -1) {
							let o = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + s;
							t[2] = t[2].substring(0, s), t[0] = t[0].substring(0, o).trim(), t[3] = "";
						}
					}
					let r = t[2], i = "";
					if (this.options.pedantic) {
						let s = this.rules.other.pedanticHrefTitle.exec(r);
						s && (r = s[1], i = s[3]);
					} else i = t[3] ? t[3].slice(1, -1) : "";
					return r = r.trim(), this.rules.other.startAngleBracket.test(r) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(n) ? r = r.slice(1) : r = r.slice(1, -1)), me(t, {
						href: r && r.replace(this.rules.inline.anyPunctuation, "$1"),
						title: i && i.replace(this.rules.inline.anyPunctuation, "$1")
					}, t[0], this.lexer, this.rules);
				}
			}
			reflink(e, t) {
				let n;
				if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
					let i = t[(n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " ").toLowerCase()];
					if (!i) {
						let s = n[0].charAt(0);
						return {
							type: "text",
							raw: s,
							text: s
						};
					}
					return me(n, i, n[0], this.lexer, this.rules);
				}
			}
			emStrong(e, t, n = "") {
				let r = this.rules.inline.emStrongLDelim.exec(e);
				if (!r || r[3] && n.match(this.rules.other.unicodeAlphaNumeric)) return;
				if (!(r[1] || r[2] || "") || !n || this.rules.inline.punctuation.exec(n)) {
					let s = [...r[0]].length - 1, a, o, p = s, u = 0, c = r[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
					for (c.lastIndex = 0, t = t.slice(-1 * e.length + s); (r = c.exec(t)) != null;) {
						if (a = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !a) continue;
						if (o = [...a].length, r[3] || r[4]) {
							p += o;
							continue;
						} else if ((r[5] || r[6]) && s % 3 && !((s + o) % 3)) {
							u += o;
							continue;
						}
						if (p -= o, p > 0) continue;
						o = Math.min(o, o + p + u);
						let g = [...r[0]][0].length, h = e.slice(0, s + r.index + g + o);
						if (Math.min(s, o) % 2) {
							let f = h.slice(1, -1);
							return {
								type: "em",
								raw: h,
								text: f,
								tokens: this.lexer.inlineTokens(f)
							};
						}
						let R = h.slice(2, -2);
						return {
							type: "strong",
							raw: h,
							text: R,
							tokens: this.lexer.inlineTokens(R)
						};
					}
				}
			}
			codespan(e) {
				let t = this.rules.inline.code.exec(e);
				if (t) {
					let n = t[2].replace(this.rules.other.newLineCharGlobal, " "), r = this.rules.other.nonSpaceChar.test(n), i = this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
					return r && i && (n = n.substring(1, n.length - 1)), {
						type: "codespan",
						raw: t[0],
						text: n
					};
				}
			}
			br(e) {
				let t = this.rules.inline.br.exec(e);
				if (t) return {
					type: "br",
					raw: t[0]
				};
			}
			del(e) {
				let t = this.rules.inline.del.exec(e);
				if (t) return {
					type: "del",
					raw: t[0],
					text: t[2],
					tokens: this.lexer.inlineTokens(t[2])
				};
			}
			autolink(e) {
				let t = this.rules.inline.autolink.exec(e);
				if (t) {
					let n, r;
					return t[2] === "@" ? (n = t[1], r = "mailto:" + n) : (n = t[1], r = n), {
						type: "link",
						raw: t[0],
						text: n,
						href: r,
						tokens: [{
							type: "text",
							raw: n,
							text: n
						}]
					};
				}
			}
			url(e) {
				let t;
				if (t = this.rules.inline.url.exec(e)) {
					let n, r;
					if (t[2] === "@") n = t[0], r = "mailto:" + n;
					else {
						let i;
						do
							i = t[0], t[0] = this.rules.inline._backpedal.exec(t[0])?.[0] ?? "";
						while (i !== t[0]);
						n = t[0], t[1] === "www." ? r = "http://" + t[0] : r = t[0];
					}
					return {
						type: "link",
						raw: t[0],
						text: n,
						href: r,
						tokens: [{
							type: "text",
							raw: n,
							text: n
						}]
					};
				}
			}
			inlineText(e) {
				let t = this.rules.inline.text.exec(e);
				if (t) {
					let n = this.lexer.state.inRawBlock;
					return {
						type: "text",
						raw: t[0],
						text: t[0],
						escaped: n
					};
				}
			}
		};
		var x = class l {
			tokens;
			options;
			state;
			tokenizer;
			inlineQueue;
			constructor(e) {
				this.tokens = [], this.tokens.links = Object.create(null), this.options = e || T, this.options.tokenizer = this.options.tokenizer || new y(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = {
					inLink: !1,
					inRawBlock: !1,
					top: !0
				};
				let t = {
					other: m,
					block: C.normal,
					inline: M.normal
				};
				this.options.pedantic ? (t.block = C.pedantic, t.inline = M.pedantic) : this.options.gfm && (t.block = C.gfm, this.options.breaks ? t.inline = M.breaks : t.inline = M.gfm), this.tokenizer.rules = t;
			}
			static get rules() {
				return {
					block: C,
					inline: M
				};
			}
			static lex(e, t) {
				return new l(t).lex(e);
			}
			static lexInline(e, t) {
				return new l(t).inlineTokens(e);
			}
			lex(e) {
				e = e.replace(m.carriageReturn, `
`), this.blockTokens(e, this.tokens);
				for (let t = 0; t < this.inlineQueue.length; t++) {
					let n = this.inlineQueue[t];
					this.inlineTokens(n.src, n.tokens);
				}
				return this.inlineQueue = [], this.tokens;
			}
			blockTokens(e, t = [], n = !1) {
				for (this.options.pedantic && (e = e.replace(m.tabCharGlobal, "    ").replace(m.spaceLine, "")); e;) {
					let r;
					if (this.options.extensions?.block?.some((s) => (r = s.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), !0) : !1)) continue;
					if (r = this.tokenizer.space(e)) {
						e = e.substring(r.raw.length);
						let s = t.at(-1);
						r.raw.length === 1 && s !== void 0 ? s.raw += `
` : t.push(r);
						continue;
					}
					if (r = this.tokenizer.code(e)) {
						e = e.substring(r.raw.length);
						let s = t.at(-1);
						s?.type === "paragraph" || s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.at(-1).src = s.text) : t.push(r);
						continue;
					}
					if (r = this.tokenizer.fences(e)) {
						e = e.substring(r.raw.length), t.push(r);
						continue;
					}
					if (r = this.tokenizer.heading(e)) {
						e = e.substring(r.raw.length), t.push(r);
						continue;
					}
					if (r = this.tokenizer.hr(e)) {
						e = e.substring(r.raw.length), t.push(r);
						continue;
					}
					if (r = this.tokenizer.blockquote(e)) {
						e = e.substring(r.raw.length), t.push(r);
						continue;
					}
					if (r = this.tokenizer.list(e)) {
						e = e.substring(r.raw.length), t.push(r);
						continue;
					}
					if (r = this.tokenizer.html(e)) {
						e = e.substring(r.raw.length), t.push(r);
						continue;
					}
					if (r = this.tokenizer.def(e)) {
						e = e.substring(r.raw.length);
						let s = t.at(-1);
						s?.type === "paragraph" || s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.raw, this.inlineQueue.at(-1).src = s.text) : this.tokens.links[r.tag] || (this.tokens.links[r.tag] = {
							href: r.href,
							title: r.title
						}, t.push(r));
						continue;
					}
					if (r = this.tokenizer.table(e)) {
						e = e.substring(r.raw.length), t.push(r);
						continue;
					}
					if (r = this.tokenizer.lheading(e)) {
						e = e.substring(r.raw.length), t.push(r);
						continue;
					}
					let i = e;
					if (this.options.extensions?.startBlock) {
						let s = Infinity, a = e.slice(1), o;
						this.options.extensions.startBlock.forEach((p) => {
							o = p.call({ lexer: this }, a), typeof o == "number" && o >= 0 && (s = Math.min(s, o));
						}), s < Infinity && s >= 0 && (i = e.substring(0, s + 1));
					}
					if (this.state.top && (r = this.tokenizer.paragraph(i))) {
						let s = t.at(-1);
						n && s?.type === "paragraph" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r), n = i.length !== e.length, e = e.substring(r.raw.length);
						continue;
					}
					if (r = this.tokenizer.text(e)) {
						e = e.substring(r.raw.length);
						let s = t.at(-1);
						s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r);
						continue;
					}
					if (e) {
						let s = "Infinite loop on byte: " + e.charCodeAt(0);
						if (this.options.silent) {
							console.error(s);
							break;
						} else throw new Error(s);
					}
				}
				return this.state.top = !0, t;
			}
			inline(e, t = []) {
				return this.inlineQueue.push({
					src: e,
					tokens: t
				}), t;
			}
			inlineTokens(e, t = []) {
				let n = e, r = null;
				if (this.tokens.links) {
					let o = Object.keys(this.tokens.links);
					if (o.length > 0) for (; (r = this.tokenizer.rules.inline.reflinkSearch.exec(n)) != null;) o.includes(r[0].slice(r[0].lastIndexOf("[") + 1, -1)) && (n = n.slice(0, r.index) + "[" + "a".repeat(r[0].length - 2) + "]" + n.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
				}
				for (; (r = this.tokenizer.rules.inline.anyPunctuation.exec(n)) != null;) n = n.slice(0, r.index) + "++" + n.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
				let i;
				for (; (r = this.tokenizer.rules.inline.blockSkip.exec(n)) != null;) i = r[2] ? r[2].length : 0, n = n.slice(0, r.index + i) + "[" + "a".repeat(r[0].length - i - 2) + "]" + n.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
				n = this.options.hooks?.emStrongMask?.call({ lexer: this }, n) ?? n;
				let s = !1, a = "";
				for (; e;) {
					s || (a = ""), s = !1;
					let o;
					if (this.options.extensions?.inline?.some((u) => (o = u.call({ lexer: this }, e, t)) ? (e = e.substring(o.raw.length), t.push(o), !0) : !1)) continue;
					if (o = this.tokenizer.escape(e)) {
						e = e.substring(o.raw.length), t.push(o);
						continue;
					}
					if (o = this.tokenizer.tag(e)) {
						e = e.substring(o.raw.length), t.push(o);
						continue;
					}
					if (o = this.tokenizer.link(e)) {
						e = e.substring(o.raw.length), t.push(o);
						continue;
					}
					if (o = this.tokenizer.reflink(e, this.tokens.links)) {
						e = e.substring(o.raw.length);
						let u = t.at(-1);
						o.type === "text" && u?.type === "text" ? (u.raw += o.raw, u.text += o.text) : t.push(o);
						continue;
					}
					if (o = this.tokenizer.emStrong(e, n, a)) {
						e = e.substring(o.raw.length), t.push(o);
						continue;
					}
					if (o = this.tokenizer.codespan(e)) {
						e = e.substring(o.raw.length), t.push(o);
						continue;
					}
					if (o = this.tokenizer.br(e)) {
						e = e.substring(o.raw.length), t.push(o);
						continue;
					}
					if (o = this.tokenizer.del(e)) {
						e = e.substring(o.raw.length), t.push(o);
						continue;
					}
					if (o = this.tokenizer.autolink(e)) {
						e = e.substring(o.raw.length), t.push(o);
						continue;
					}
					if (!this.state.inLink && (o = this.tokenizer.url(e))) {
						e = e.substring(o.raw.length), t.push(o);
						continue;
					}
					let p = e;
					if (this.options.extensions?.startInline) {
						let u = Infinity, c = e.slice(1), g;
						this.options.extensions.startInline.forEach((h) => {
							g = h.call({ lexer: this }, c), typeof g == "number" && g >= 0 && (u = Math.min(u, g));
						}), u < Infinity && u >= 0 && (p = e.substring(0, u + 1));
					}
					if (o = this.tokenizer.inlineText(p)) {
						e = e.substring(o.raw.length), o.raw.slice(-1) !== "_" && (a = o.raw.slice(-1)), s = !0;
						let u = t.at(-1);
						u?.type === "text" ? (u.raw += o.raw, u.text += o.text) : t.push(o);
						continue;
					}
					if (e) {
						let u = "Infinite loop on byte: " + e.charCodeAt(0);
						if (this.options.silent) {
							console.error(u);
							break;
						} else throw new Error(u);
					}
				}
				return t;
			}
		};
		var P = class {
			options;
			parser;
			constructor(e) {
				this.options = e || T;
			}
			space(e) {
				return "";
			}
			code({ text: e, lang: t, escaped: n }) {
				let r = (t || "").match(m.notSpaceStart)?.[0], i = e.replace(m.endingNewline, "") + `
`;
				return r ? "<pre><code class=\"language-" + w(r) + "\">" + (n ? i : w(i, !0)) + `</code></pre>
` : "<pre><code>" + (n ? i : w(i, !0)) + `</code></pre>
`;
			}
			blockquote({ tokens: e }) {
				return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
			}
			html({ text: e }) {
				return e;
			}
			def(e) {
				return "";
			}
			heading({ tokens: e, depth: t }) {
				return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
			}
			hr(e) {
				return `<hr>
`;
			}
			list(e) {
				let t = e.ordered, n = e.start, r = "";
				for (let a = 0; a < e.items.length; a++) {
					let o = e.items[a];
					r += this.listitem(o);
				}
				let i = t ? "ol" : "ul", s = t && n !== 1 ? " start=\"" + n + "\"" : "";
				return "<" + i + s + `>
` + r + "</" + i + `>
`;
			}
			listitem(e) {
				let t = "";
				if (e.task) {
					let n = this.checkbox({ checked: !!e.checked });
					e.loose ? e.tokens[0]?.type === "paragraph" ? (e.tokens[0].text = n + " " + e.tokens[0].text, e.tokens[0].tokens && e.tokens[0].tokens.length > 0 && e.tokens[0].tokens[0].type === "text" && (e.tokens[0].tokens[0].text = n + " " + w(e.tokens[0].tokens[0].text), e.tokens[0].tokens[0].escaped = !0)) : e.tokens.unshift({
						type: "text",
						raw: n + " ",
						text: n + " ",
						escaped: !0
					}) : t += n + " ";
				}
				return t += this.parser.parse(e.tokens, !!e.loose), `<li>${t}</li>
`;
			}
			checkbox({ checked: e }) {
				return "<input " + (e ? "checked=\"\" " : "") + "disabled=\"\" type=\"checkbox\">";
			}
			paragraph({ tokens: e }) {
				return `<p>${this.parser.parseInline(e)}</p>
`;
			}
			table(e) {
				let t = "", n = "";
				for (let i = 0; i < e.header.length; i++) n += this.tablecell(e.header[i]);
				t += this.tablerow({ text: n });
				let r = "";
				for (let i = 0; i < e.rows.length; i++) {
					let s = e.rows[i];
					n = "";
					for (let a = 0; a < s.length; a++) n += this.tablecell(s[a]);
					r += this.tablerow({ text: n });
				}
				return r && (r = `<tbody>${r}</tbody>`), `<table>
<thead>
` + t + `</thead>
` + r + `</table>
`;
			}
			tablerow({ text: e }) {
				return `<tr>
${e}</tr>
`;
			}
			tablecell(e) {
				let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
				return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
			}
			strong({ tokens: e }) {
				return `<strong>${this.parser.parseInline(e)}</strong>`;
			}
			em({ tokens: e }) {
				return `<em>${this.parser.parseInline(e)}</em>`;
			}
			codespan({ text: e }) {
				return `<code>${w(e, !0)}</code>`;
			}
			br(e) {
				return "<br>";
			}
			del({ tokens: e }) {
				return `<del>${this.parser.parseInline(e)}</del>`;
			}
			link({ href: e, title: t, tokens: n }) {
				let r = this.parser.parseInline(n), i = J(e);
				if (i === null) return r;
				e = i;
				let s = "<a href=\"" + e + "\"";
				return t && (s += " title=\"" + w(t) + "\""), s += ">" + r + "</a>", s;
			}
			image({ href: e, title: t, text: n, tokens: r }) {
				r && (n = this.parser.parseInline(r, this.parser.textRenderer));
				let i = J(e);
				if (i === null) return w(n);
				e = i;
				let s = `<img src="${e}" alt="${n}"`;
				return t && (s += ` title="${w(t)}"`), s += ">", s;
			}
			text(e) {
				return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : "escaped" in e && e.escaped ? e.text : w(e.text);
			}
		};
		var $ = class {
			strong({ text: e }) {
				return e;
			}
			em({ text: e }) {
				return e;
			}
			codespan({ text: e }) {
				return e;
			}
			del({ text: e }) {
				return e;
			}
			html({ text: e }) {
				return e;
			}
			text({ text: e }) {
				return e;
			}
			link({ text: e }) {
				return "" + e;
			}
			image({ text: e }) {
				return "" + e;
			}
			br() {
				return "";
			}
		};
		var b = class l {
			options;
			renderer;
			textRenderer;
			constructor(e) {
				this.options = e || T, this.options.renderer = this.options.renderer || new P(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new $();
			}
			static parse(e, t) {
				return new l(t).parse(e);
			}
			static parseInline(e, t) {
				return new l(t).parseInline(e);
			}
			parse(e, t = !0) {
				let n = "";
				for (let r = 0; r < e.length; r++) {
					let i = e[r];
					if (this.options.extensions?.renderers?.[i.type]) {
						let a = i, o = this.options.extensions.renderers[a.type].call({ parser: this }, a);
						if (o !== !1 || ![
							"space",
							"hr",
							"heading",
							"code",
							"table",
							"blockquote",
							"list",
							"html",
							"def",
							"paragraph",
							"text"
						].includes(a.type)) {
							n += o || "";
							continue;
						}
					}
					let s = i;
					switch (s.type) {
						case "space":
							n += this.renderer.space(s);
							continue;
						case "hr":
							n += this.renderer.hr(s);
							continue;
						case "heading":
							n += this.renderer.heading(s);
							continue;
						case "code":
							n += this.renderer.code(s);
							continue;
						case "table":
							n += this.renderer.table(s);
							continue;
						case "blockquote":
							n += this.renderer.blockquote(s);
							continue;
						case "list":
							n += this.renderer.list(s);
							continue;
						case "html":
							n += this.renderer.html(s);
							continue;
						case "def":
							n += this.renderer.def(s);
							continue;
						case "paragraph":
							n += this.renderer.paragraph(s);
							continue;
						case "text": {
							let a = s, o = this.renderer.text(a);
							for (; r + 1 < e.length && e[r + 1].type === "text";) a = e[++r], o += `
` + this.renderer.text(a);
							t ? n += this.renderer.paragraph({
								type: "paragraph",
								raw: o,
								text: o,
								tokens: [{
									type: "text",
									raw: o,
									text: o,
									escaped: !0
								}]
							}) : n += o;
							continue;
						}
						default: {
							let a = "Token with \"" + s.type + "\" type was not found.";
							if (this.options.silent) return console.error(a), "";
							throw new Error(a);
						}
					}
				}
				return n;
			}
			parseInline(e, t = this.renderer) {
				let n = "";
				for (let r = 0; r < e.length; r++) {
					let i = e[r];
					if (this.options.extensions?.renderers?.[i.type]) {
						let a = this.options.extensions.renderers[i.type].call({ parser: this }, i);
						if (a !== !1 || ![
							"escape",
							"html",
							"link",
							"image",
							"strong",
							"em",
							"codespan",
							"br",
							"del",
							"text"
						].includes(i.type)) {
							n += a || "";
							continue;
						}
					}
					let s = i;
					switch (s.type) {
						case "escape":
							n += t.text(s);
							break;
						case "html":
							n += t.html(s);
							break;
						case "link":
							n += t.link(s);
							break;
						case "image":
							n += t.image(s);
							break;
						case "strong":
							n += t.strong(s);
							break;
						case "em":
							n += t.em(s);
							break;
						case "codespan":
							n += t.codespan(s);
							break;
						case "br":
							n += t.br(s);
							break;
						case "del":
							n += t.del(s);
							break;
						case "text":
							n += t.text(s);
							break;
						default: {
							let a = "Token with \"" + s.type + "\" type was not found.";
							if (this.options.silent) return console.error(a), "";
							throw new Error(a);
						}
					}
				}
				return n;
			}
		};
		var S = class {
			options;
			block;
			constructor(e) {
				this.options = e || T;
			}
			static passThroughHooks = /* @__PURE__ */ new Set([
				"preprocess",
				"postprocess",
				"processAllTokens",
				"emStrongMask"
			]);
			static passThroughHooksRespectAsync = /* @__PURE__ */ new Set([
				"preprocess",
				"postprocess",
				"processAllTokens"
			]);
			preprocess(e) {
				return e;
			}
			postprocess(e) {
				return e;
			}
			processAllTokens(e) {
				return e;
			}
			emStrongMask(e) {
				return e;
			}
			provideLexer() {
				return this.block ? x.lex : x.lexInline;
			}
			provideParser() {
				return this.block ? b.parse : b.parseInline;
			}
		};
		var B = class {
			defaults = L();
			options = this.setOptions;
			parse = this.parseMarkdown(!0);
			parseInline = this.parseMarkdown(!1);
			Parser = b;
			Renderer = P;
			TextRenderer = $;
			Lexer = x;
			Tokenizer = y;
			Hooks = S;
			constructor(...e) {
				this.use(...e);
			}
			walkTokens(e, t) {
				let n = [];
				for (let r of e) switch (n = n.concat(t.call(this, r)), r.type) {
					case "table": {
						let i = r;
						for (let s of i.header) n = n.concat(this.walkTokens(s.tokens, t));
						for (let s of i.rows) for (let a of s) n = n.concat(this.walkTokens(a.tokens, t));
						break;
					}
					case "list": {
						let i = r;
						n = n.concat(this.walkTokens(i.items, t));
						break;
					}
					default: {
						let i = r;
						this.defaults.extensions?.childTokens?.[i.type] ? this.defaults.extensions.childTokens[i.type].forEach((s) => {
							let a = i[s].flat(Infinity);
							n = n.concat(this.walkTokens(a, t));
						}) : i.tokens && (n = n.concat(this.walkTokens(i.tokens, t)));
					}
				}
				return n;
			}
			use(...e) {
				let t = this.defaults.extensions || {
					renderers: {},
					childTokens: {}
				};
				return e.forEach((n) => {
					let r = { ...n };
					if (r.async = this.defaults.async || r.async || !1, n.extensions && (n.extensions.forEach((i) => {
						if (!i.name) throw new Error("extension name required");
						if ("renderer" in i) {
							let s = t.renderers[i.name];
							s ? t.renderers[i.name] = function(...a) {
								let o = i.renderer.apply(this, a);
								return o === !1 && (o = s.apply(this, a)), o;
							} : t.renderers[i.name] = i.renderer;
						}
						if ("tokenizer" in i) {
							if (!i.level || i.level !== "block" && i.level !== "inline") throw new Error("extension level must be 'block' or 'inline'");
							let s = t[i.level];
							s ? s.unshift(i.tokenizer) : t[i.level] = [i.tokenizer], i.start && (i.level === "block" ? t.startBlock ? t.startBlock.push(i.start) : t.startBlock = [i.start] : i.level === "inline" && (t.startInline ? t.startInline.push(i.start) : t.startInline = [i.start]));
						}
						"childTokens" in i && i.childTokens && (t.childTokens[i.name] = i.childTokens);
					}), r.extensions = t), n.renderer) {
						let i = this.defaults.renderer || new P(this.defaults);
						for (let s in n.renderer) {
							if (!(s in i)) throw new Error(`renderer '${s}' does not exist`);
							if (["options", "parser"].includes(s)) continue;
							let a = s, o = n.renderer[a], p = i[a];
							i[a] = (...u) => {
								let c = o.apply(i, u);
								return c === !1 && (c = p.apply(i, u)), c || "";
							};
						}
						r.renderer = i;
					}
					if (n.tokenizer) {
						let i = this.defaults.tokenizer || new y(this.defaults);
						for (let s in n.tokenizer) {
							if (!(s in i)) throw new Error(`tokenizer '${s}' does not exist`);
							if ([
								"options",
								"rules",
								"lexer"
							].includes(s)) continue;
							let a = s, o = n.tokenizer[a], p = i[a];
							i[a] = (...u) => {
								let c = o.apply(i, u);
								return c === !1 && (c = p.apply(i, u)), c;
							};
						}
						r.tokenizer = i;
					}
					if (n.hooks) {
						let i = this.defaults.hooks || new S();
						for (let s in n.hooks) {
							if (!(s in i)) throw new Error(`hook '${s}' does not exist`);
							if (["options", "block"].includes(s)) continue;
							let a = s, o = n.hooks[a], p = i[a];
							S.passThroughHooks.has(s) ? i[a] = (u) => {
								if (this.defaults.async && S.passThroughHooksRespectAsync.has(s)) return (async () => {
									let g = await o.call(i, u);
									return p.call(i, g);
								})();
								let c = o.call(i, u);
								return p.call(i, c);
							} : i[a] = (...u) => {
								if (this.defaults.async) return (async () => {
									let g = await o.apply(i, u);
									return g === !1 && (g = await p.apply(i, u)), g;
								})();
								let c = o.apply(i, u);
								return c === !1 && (c = p.apply(i, u)), c;
							};
						}
						r.hooks = i;
					}
					if (n.walkTokens) {
						let i = this.defaults.walkTokens, s = n.walkTokens;
						r.walkTokens = function(a) {
							let o = [];
							return o.push(s.call(this, a)), i && (o = o.concat(i.call(this, a))), o;
						};
					}
					this.defaults = {
						...this.defaults,
						...r
					};
				}), this;
			}
			setOptions(e) {
				return this.defaults = {
					...this.defaults,
					...e
				}, this;
			}
			lexer(e, t) {
				return x.lex(e, t ?? this.defaults);
			}
			parser(e, t) {
				return b.parse(e, t ?? this.defaults);
			}
			parseMarkdown(e) {
				return (n, r) => {
					let i = { ...r }, s = {
						...this.defaults,
						...i
					}, a = this.onError(!!s.silent, !!s.async);
					if (this.defaults.async === !0 && i.async === !1) return a(/* @__PURE__ */ new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
					if (typeof n > "u" || n === null) return a(/* @__PURE__ */ new Error("marked(): input parameter is undefined or null"));
					if (typeof n != "string") return a(/* @__PURE__ */ new Error("marked(): input parameter is of type " + Object.prototype.toString.call(n) + ", string expected"));
					if (s.hooks && (s.hooks.options = s, s.hooks.block = e), s.async) return (async () => {
						let o = s.hooks ? await s.hooks.preprocess(n) : n, u = await (s.hooks ? await s.hooks.provideLexer() : e ? x.lex : x.lexInline)(o, s), c = s.hooks ? await s.hooks.processAllTokens(u) : u;
						s.walkTokens && await Promise.all(this.walkTokens(c, s.walkTokens));
						let h = await (s.hooks ? await s.hooks.provideParser() : e ? b.parse : b.parseInline)(c, s);
						return s.hooks ? await s.hooks.postprocess(h) : h;
					})().catch(a);
					try {
						s.hooks && (n = s.hooks.preprocess(n));
						let p = (s.hooks ? s.hooks.provideLexer() : e ? x.lex : x.lexInline)(n, s);
						s.hooks && (p = s.hooks.processAllTokens(p)), s.walkTokens && this.walkTokens(p, s.walkTokens);
						let c = (s.hooks ? s.hooks.provideParser() : e ? b.parse : b.parseInline)(p, s);
						return s.hooks && (c = s.hooks.postprocess(c)), c;
					} catch (o) {
						return a(o);
					}
				};
			}
			onError(e, t) {
				return (n) => {
					if (n.message += `
Please report this to https://github.com/markedjs/marked.`, e) {
						let r = "<p>An error occurred:</p><pre>" + w(n.message + "", !0) + "</pre>";
						return t ? Promise.resolve(r) : r;
					}
					if (t) return Promise.reject(n);
					throw n;
				};
			}
		};
		var _ = new B();
		function k(l, e) {
			return _.parse(l, e);
		}
		k.options = k.setOptions = function(l) {
			return _.setOptions(l), k.defaults = _.defaults, G(k.defaults), k;
		};
		k.getDefaults = L;
		k.defaults = T;
		k.use = function(...l) {
			return _.use(...l), k.defaults = _.defaults, G(k.defaults), k;
		};
		k.walkTokens = function(l, e) {
			return _.walkTokens(l, e);
		};
		k.parseInline = _.parseInline;
		k.Parser = b;
		k.parser = b.parse;
		k.Renderer = P;
		k.TextRenderer = $;
		k.Lexer = x;
		k.lexer = x.lex;
		k.Tokenizer = y;
		k.Hooks = S;
		k.parse = k;
		k.options;
		k.setOptions;
		k.use;
		k.walkTokens;
		k.parseInline;
		b.parse;
		x.lex;
		//#endregion
		//#region src/protocol.ts
		/** Shared, browser-safe protocol and domain definitions. */
		const STAGES = [
			{
				id: "requirements",
				label: "需求讨论",
				role: "产品与业务分析",
				outputType: "requirement-spec",
				prefix: "REQ"
			},
			{
				id: "prototype",
				label: "原型输出",
				role: "产品设计与 UX",
				outputType: "prototype-spec",
				prefix: "UX"
			},
			{
				id: "architecture",
				label: "系统设计",
				role: "架构师与技术负责人",
				outputType: "architecture-spec",
				prefix: "ARCH"
			},
			{
				id: "specification",
				label: "规格设计",
				role: "技术负责人、开发与测试",
				outputType: "implementation-spec",
				prefix: "SPEC"
			},
			{
				id: "development",
				label: "开发测试",
				role: "开发、测试与 Reviewer",
				outputType: "development-delivery",
				prefix: "DEV"
			}
		];
		/** Canonical templates shared by draft creation, the browser workbench, and AI prompts. */
		const STAGE_ARTIFACT_TEMPLATES = {
			requirements: {
				documentName: "需求规格说明",
				maintenanceGuide: "记录已经确认的业务事实和可验证需求；未确认内容统一放入“待决问题”。",
				sections: [
					{
						title: "背景与目标",
						guidance: "说明业务背景、问题、目标价值和可量化成功指标，不在这里预设技术实现。",
						suggestedSubsections: [
							"业务背景",
							"目标与价值",
							"成功指标",
							"术语说明"
						]
					},
					{
						title: "范围",
						guidance: "明确本次交付的范围内、范围外内容，以及已知约束和假设。",
						suggestedSubsections: [
							"范围内",
							"范围外",
							"约束与假设"
						]
					},
					{
						title: "用户与场景",
						guidance: "列出用户角色、触发条件、核心场景和端到端业务流程。",
						suggestedSubsections: [
							"用户角色",
							"核心场景",
							"业务流程"
						]
					},
					{
						title: "功能需求",
						guidance: "按可追踪编号描述业务规则、前置条件、主流程、分支和异常流程。",
						suggestedSubsections: [
							"功能清单",
							"业务规则",
							"流程与边界"
						]
					},
					{
						title: "非功能需求",
						guidance: "给出可验证的性能、安全、权限、审计、兼容性、可用性等约束。",
						suggestedSubsections: [
							"性能与容量",
							"安全与权限",
							"可用性与兼容性"
						]
					},
					{
						title: "验收条件",
						guidance: "为功能需求提供可测试的验收条件，推荐使用 Given/When/Then 并关联需求编号。",
						suggestedSubsections: [
							"验收场景",
							"验收数据",
							"追踪关系"
						]
					},
					{
						title: "待决问题",
						guidance: "记录未确认事项、影响、责任人和计划确认时间；没有时明确写“无”。",
						suggestedSubsections: ["问题清单"]
					}
				]
			},
			prototype: {
				documentName: "原型与交互规格",
				maintenanceGuide: "以已接受需求为边界，描述可评审的流程、页面、组件状态和原型资源。",
				sections: [
					{
						title: "设计目标",
						guidance: "说明设计服务的用户任务、体验目标、原则和成功标准。",
						suggestedSubsections: [
							"用户任务",
							"体验目标",
							"设计原则"
						]
					},
					{
						title: "用户流程",
						guidance: "描述入口、关键步骤、分支、出口以及跨页面流转关系。",
						suggestedSubsections: [
							"主流程",
							"分支流程",
							"流程图"
						]
					},
					{
						title: "页面清单",
						guidance: "逐页说明页面目的、入口、核心区域、操作和出口。",
						suggestedSubsections: [
							"信息架构",
							"页面明细",
							"组件清单"
						]
					},
					{
						title: "交互规则",
						guidance: "定义触发方式、反馈、校验、导航、撤销和防重复操作规则。",
						suggestedSubsections: [
							"操作与反馈",
							"表单与校验",
							"导航规则"
						]
					},
					{
						title: "状态与异常",
						guidance: "覆盖加载、空态、错误、无权限、离线、超时和并发冲突等状态。",
						suggestedSubsections: [
							"页面状态",
							"异常状态",
							"权限状态"
						]
					},
					{
						title: "原型资源",
						guidance: "记录原型、流程图、设计稿、组件规范的仓库内路径或稳定链接及版本。",
						suggestedSubsections: ["资源索引", "版本说明"]
					},
					{
						title: "待决问题",
						guidance: "记录影响原型确认的未决事项及其责任人、影响和计划确认时间。",
						suggestedSubsections: ["问题清单"]
					}
				]
			},
			architecture: {
				documentName: "系统设计说明",
				maintenanceGuide: "把需求和约束转化为系统边界、仓库范围、模块、数据、接口及可追踪架构决策。",
				sections: [
					{
						title: "设计目标",
						guidance: "说明本次设计要解决的问题、质量属性、设计原则和不做事项。",
						suggestedSubsections: [
							"目标",
							"质量属性",
							"非目标"
						]
					},
					{
						title: "上下文与约束",
						guidance: "描述系统上下文、现状、依赖、技术与组织约束，以及关键假设。",
						suggestedSubsections: [
							"系统上下文",
							"现状与依赖",
							"约束与假设"
						]
					},
					{
						title: "总体架构",
						guidance: "给出整体方案、组件关系、关键调用链和必要的架构图。",
						suggestedSubsections: [
							"方案概览",
							"组件关系",
							"关键调用链"
						]
					},
					{
						title: "模块职责",
						guidance: "明确涉及的代码仓库、模块边界、职责、所有者和变更范围。",
						suggestedSubsections: [
							"代码仓库范围",
							"模块边界",
							"职责与所有者"
						]
					},
					{
						title: "数据设计",
						guidance: "定义核心数据模型、存储、生命周期、一致性、迁移和容量考虑。",
						suggestedSubsections: [
							"数据模型",
							"存储与一致性",
							"迁移与生命周期"
						]
					},
					{
						title: "接口与集成",
						guidance: "定义内部及外部接口、协议、鉴权、幂等、超时、重试和兼容策略。",
						suggestedSubsections: [
							"接口清单",
							"集成契约",
							"失败处理"
						]
					},
					{
						title: "部署与安全",
						guidance: "说明部署拓扑、配置、可观测性、容量、安全、回滚和容灾方案。",
						suggestedSubsections: [
							"部署拓扑",
							"安全设计",
							"可观测性与容灾"
						]
					},
					{
						title: "架构决策",
						guidance: "逐项记录候选方案、权衡、最终决策、后果及适用范围。",
						suggestedSubsections: ["决策记录"]
					}
				]
			},
			specification: {
				documentName: "实现规格说明",
				maintenanceGuide: "把已接受设计细化为开发和测试可无歧义执行的仓库级实现规格。",
				sections: [
					{
						title: "实现目标",
						guidance: "说明本规格实现的能力、边界、成功标准和不包含的工作。",
						suggestedSubsections: [
							"目标",
							"实现边界",
							"成功标准"
						]
					},
					{
						title: "输入依据",
						guidance: "列出需求、原型、系统设计、代码仓库和版本基线，并确认开发目标仓库。",
						suggestedSubsections: [
							"上游交付件",
							"目标代码仓库",
							"版本基线"
						]
					},
					{
						title: "功能规格",
						guidance: "按规格编号给出组件或模块级行为、算法、流程、边界和兼容要求。",
						suggestedSubsections: [
							"变更清单",
							"详细行为",
							"兼容与迁移"
						]
					},
					{
						title: "接口契约",
						guidance: "明确 API、事件或内部接口的输入、输出、校验、错误码、鉴权和示例。",
						suggestedSubsections: [
							"接口清单",
							"请求与响应",
							"错误码与示例"
						]
					},
					{
						title: "状态与数据规则",
						guidance: "定义数据结构、状态机、不变量、事务、一致性及迁移规则。",
						suggestedSubsections: [
							"数据结构",
							"状态机",
							"事务与一致性"
						]
					},
					{
						title: "异常处理",
						guidance: "覆盖非法输入、依赖失败、超时、并发、重试、降级和恢复策略。",
						suggestedSubsections: [
							"异常矩阵",
							"重试与降级",
							"恢复策略"
						]
					},
					{
						title: "验收测试规格",
						guidance: "给出正常、边界、异常、回归和非功能测试及预期结果。",
						suggestedSubsections: [
							"测试场景",
							"测试数据",
							"预期结果"
						]
					},
					{
						title: "追踪关系",
						guidance: "建立需求、设计、规格、测试和目标代码位置之间的编号映射。",
						suggestedSubsections: ["追踪矩阵"]
					}
				]
			},
			development: {
				documentName: "开发测试交付记录",
				maintenanceGuide: "只记录绑定隔离代码空间中的真实实现、命令、测试证据和提交状态。",
				sections: [
					{
						title: "实现范围",
						guidance: "列出实际实现的规格编号、范围、明确未实现项及偏差原因。",
						suggestedSubsections: ["已实现规格", "未实现与偏差"]
					},
					{
						title: "代码仓库与分支",
						guidance: "记录每个目标仓库、基线、工作分支、隔离目录和当前提交。",
						suggestedSubsections: ["仓库清单", "基线与分支"]
					},
					{
						title: "变更摘要",
						guidance: "按仓库和模块说明代码、配置、数据迁移及兼容性变更。",
						suggestedSubsections: [
							"代码变更",
							"配置与迁移",
							"兼容性说明"
						]
					},
					{
						title: "测试计划",
						guidance: "列出计划执行的单元、集成、端到端、回归和非功能测试。",
						suggestedSubsections: [
							"测试范围",
							"测试命令",
							"测试数据"
						]
					},
					{
						title: "测试结果",
						guidance: "记录真实执行时间、环境、命令、结果、失败原因和证据；禁止推测。",
						suggestedSubsections: [
							"执行记录",
							"失败与处置",
							"测试证据"
						]
					},
					{
						title: "提交与合并记录",
						guidance: "记录真实提交、评审或合并请求及其状态；未提交或未合并时明确说明。",
						suggestedSubsections: ["提交记录", "评审与合并状态"]
					},
					{
						title: "遗留问题",
						guidance: "记录技术债、已知风险、未完成测试、后续工作和责任人；没有时明确写“无”。",
						suggestedSubsections: ["问题清单"]
					}
				]
			}
		};
		//#endregion
		//#region src/client/index.ts
		const name = "dsh-e2e-dev-sdd-client";
		const inject = ["workspaces", "sessions"];
		const API_PATH = "/api/dsh-e2e-dev-sdd";
		const ACTIVE_ATTR = "data-dsh-sdd-active";
		const MENUS = [{
			id: "dashboard",
			label: "项目看板"
		}, ...STAGES];
		const CSS = `
[data-dsh-sdd-view]{position:absolute;inset:0;display:none;z-index:70;overflow:auto;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#171717);font-family:var(--dsw-font-family,system-ui)}
html[${ACTIVE_ATTR}] [data-dsh-sdd-view]{display:block}html[${ACTIVE_ATTR}] [data-pane='conversation']>:not([data-dsh-sdd-view]),html[${ACTIVE_ATTR}] [class*='centerCol']>:not([data-dsh-sdd-view]){display:none!important}
.dsh-sdd-menu{box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;height:36px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary,#666);cursor:pointer;font-size:13px;white-space:nowrap}.dsh-sdd-menu:hover,.dsh-sdd-menu[data-active]{background:var(--dsw-alias-interactive-bg-hover,#eee);color:var(--dsw-alias-label-primary,#111)}.dsh-sdd-menu[data-active]{font-weight:600}.dsh-sdd-menu svg{width:18px;height:18px;flex:none}.dsh-sdd-menu span{overflow:hidden;text-overflow:ellipsis}[data-dsh-frame][data-sidebar-collapsed] .dsh-sdd-menu{justify-content:center;width:36px;margin:0 auto 8px;padding:0;border-radius:50%}[data-dsh-frame][data-sidebar-collapsed] .dsh-sdd-menu span{display:none}
.dsh-sdd-page{box-sizing:border-box;width:100%;min-height:100%;padding:20px;max-width:1220px;margin:0 auto}.dsh-sdd-header{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}.dsh-sdd-header h1{font-size:22px;margin:0;margin-right:auto}.dsh-sdd-header .dsh-sdd-select{min-width:0;max-width:min(360px,100%)}.dsh-sdd-select,.dsh-sdd-input{box-sizing:border-box;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2,#ccc);border-radius:8px;background:var(--dsw-specific-input-major,#fff);color:inherit}.dsh-sdd-button{padding:8px 12px;border:1px solid var(--dsw-alias-border-l2,#ccc);border-radius:8px;background:var(--dsw-alias-bg-layer-2,#f5f5f5);color:inherit;cursor:pointer}.dsh-sdd-button:hover{filter:brightness(.97)}.dsh-sdd-button.primary{background:var(--dsw-alias-button-primary-fill,#3b63f3);border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff)}.dsh-sdd-button:disabled{opacity:.5;cursor:not-allowed}
.dsh-sdd-grid{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:14px}@media(max-width:850px){.dsh-sdd-grid{grid-template-columns:minmax(0,1fr)}}.dsh-sdd-card{min-width:0;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:12px;background:var(--dsw-alias-bg-layer-2,#fafafa);padding:14px}.dsh-sdd-card h2{font-size:15px;margin:0 0 10px}.dsh-sdd-muted{font-size:12px;color:var(--dsw-alias-label-secondary,#666);overflow-wrap:anywhere}.dsh-sdd-list{display:flex;min-width:0;flex-direction:column;gap:8px}.dsh-sdd-row{display:grid;min-width:0;grid-template-columns:auto minmax(0,1fr) auto;align-items:start;gap:9px;padding:10px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;background:var(--dsw-alias-bg-base,#fff)}.dsh-sdd-row>span{min-width:0}.dsh-sdd-row strong{display:block;font-size:13px;overflow-wrap:anywhere}.dsh-sdd-badge{display:inline-block;max-width:100%;font-size:11px;padding:2px 6px;border-radius:999px;background:var(--dsw-alias-interactive-bg-hover,#eee);margin:0 0 4px 4px;overflow-wrap:anywhere}.dsh-sdd-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.dsh-sdd-error{padding:9px;border-radius:8px;background:#c5303018;color:#c53030;font-size:12px;overflow-wrap:anywhere}.dsh-sdd-empty{padding:18px;text-align:center;color:var(--dsw-alias-label-secondary,#666)}
.dsh-sdd-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:14px}.dsh-sdd-stat{box-sizing:border-box;min-width:0;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:12px;padding:14px;background:var(--dsw-alias-bg-layer-2,#fafafa);overflow:hidden}.dsh-sdd-stat b{display:block;min-width:0;font-size:clamp(20px,2vw,25px);line-height:1.2;margin-top:5px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.dsh-sdd-workload-list{display:flex;flex-direction:column;gap:5px;max-height:86px;margin-top:8px;overflow:auto}.dsh-sdd-workload-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;font-size:12px}.dsh-sdd-workload-row span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsh-sdd-workload-row strong{font-variant-numeric:tabular-nums;white-space:nowrap}.dsh-sdd-progress{height:8px;background:var(--dsw-alias-interactive-bg-hover,#e5e5e5);border-radius:999px;overflow:hidden;margin-top:7px}.dsh-sdd-progress span{display:block;height:100%;background:var(--dsw-alias-brand-primary,#3b63f3)}.dsh-sdd-stage-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.dsh-sdd-stage-grid .dsh-sdd-stat{padding:12px}.dsh-sdd-stage-head{display:flex;align-items:flex-start;justify-content:space-between;gap:6px}.dsh-sdd-stage-head .dsh-sdd-badge{flex:none}.dsh-sdd-scroll-list{max-height:340px;overflow:auto;overscroll-behavior:contain;padding-right:3px}.dsh-sdd-dashboard-columns{align-items:start}.dsh-sdd-dashboard-columns>.dsh-sdd-card{max-height:430px;overflow:hidden}.dsh-sdd-dashboard-columns .dsh-sdd-checks{max-height:340px;overflow:auto;padding-right:4px}.dsh-sdd-trace-list{max-height:420px;overflow:auto;overscroll-behavior:contain}.dsh-sdd-checks{margin:7px 0 0;padding-left:17px;font-size:12px;overflow-wrap:anywhere}.dsh-sdd-checks li+li{margin-top:5px}.dsh-sdd-checks li[data-fail]{color:#c53030}.dsh-sdd-checks li[data-pass]{color:#238636}.dsh-sdd-wide{grid-column:1/-1}@media(max-width:1000px){.dsh-sdd-stats{grid-template-columns:repeat(3,minmax(0,1fr))}.dsh-sdd-stage-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:700px){.dsh-sdd-stats,.dsh-sdd-stage-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dsh-sdd-page{padding:14px}.dsh-sdd-header{gap:8px}.dsh-sdd-header h1{width:100%;order:-1}.dsh-sdd-header .dsh-sdd-select{flex:1 1 220px}}@media(max-width:430px){.dsh-sdd-stats,.dsh-sdd-stage-grid{grid-template-columns:minmax(0,1fr)}}
.dsh-sdd-chart-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);gap:14px;margin-bottom:14px}.dsh-sdd-chart-legend{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:10px;font-size:11px;color:var(--dsw-alias-label-secondary,#666)}.dsh-sdd-chart-legend span{display:inline-flex;align-items:center;gap:5px}.dsh-sdd-legend-swatch{width:14px;height:9px;border:1px solid var(--dsw-alias-label-secondary,#666);border-radius:2px}.dsh-sdd-flow-list{display:flex;flex-direction:column;gap:10px}.dsh-sdd-flow-row{display:grid;grid-template-columns:72px minmax(0,1fr) 28px;align-items:center;gap:9px;font-size:12px}.dsh-sdd-flow-bar{display:flex;height:15px;overflow:hidden;border:1px solid var(--dsw-alias-border-l2,#bbb);border-radius:4px;background:var(--dsw-alias-bg-base,#fff)}.dsh-sdd-flow-segment{height:100%;min-width:0}.dsh-sdd-flow-segment[data-status="not-started"],.dsh-sdd-legend-swatch[data-status="not-started"]{background:transparent}.dsh-sdd-flow-segment[data-status="in-progress"],.dsh-sdd-legend-swatch[data-status="in-progress"]{background:var(--dsw-alias-label-tertiary,#aaa)}.dsh-sdd-flow-segment[data-status="ready-for-review"],.dsh-sdd-legend-swatch[data-status="ready-for-review"]{background:repeating-linear-gradient(90deg,var(--dsw-alias-label-secondary,#666) 0 2px,transparent 2px 4px)}.dsh-sdd-flow-segment[data-status="completed"],.dsh-sdd-legend-swatch[data-status="completed"]{background:var(--dsw-alias-label-primary,#222)}.dsh-sdd-flow-segment[data-status="blocked"],.dsh-sdd-legend-swatch[data-status="blocked"]{background:repeating-linear-gradient(135deg,var(--dsw-alias-label-primary,#222) 0 2px,transparent 2px 5px)}.dsh-sdd-burnup{display:block;width:100%;height:auto;min-height:210px;color:var(--dsw-alias-label-primary,#222)}.dsh-sdd-burnup-grid{stroke:var(--dsw-alias-border-l1,#ddd);stroke-width:1}.dsh-sdd-burnup-total{fill:none;stroke:currentColor;stroke-width:2;stroke-dasharray:6 4;opacity:.55}.dsh-sdd-burnup-completed{fill:none;stroke:currentColor;stroke-width:2.5}.dsh-sdd-burnup-point{fill:var(--dsw-alias-bg-base,#fff);stroke:currentColor;stroke-width:2}.dsh-sdd-burnup text{fill:var(--dsw-alias-label-secondary,#666);font:11px var(--dsw-font-family,system-ui)}.dsh-sdd-matrix-scroll{max-height:520px;overflow:auto;overscroll-behavior:contain;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px}.dsh-sdd-matrix{width:100%;min-width:820px;border-collapse:separate;border-spacing:0;font-size:12px}.dsh-sdd-matrix th,.dsh-sdd-matrix td{padding:7px;border-right:1px solid var(--dsw-alias-border-l1,#ddd);border-bottom:1px solid var(--dsw-alias-border-l1,#ddd);background:var(--dsw-alias-bg-base,#fff)}.dsh-sdd-matrix th{position:sticky;top:0;z-index:2;background:var(--dsw-alias-bg-layer-2,#fafafa);text-align:left}.dsh-sdd-matrix th:first-child,.dsh-sdd-matrix td:first-child{position:sticky;left:0;z-index:1;width:220px;min-width:220px}.dsh-sdd-matrix th:first-child{z-index:3}.dsh-sdd-matrix tr:last-child td{border-bottom:0}.dsh-sdd-matrix th:last-child,.dsh-sdd-matrix td:last-child{border-right:0}.dsh-sdd-matrix-work{display:block;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsh-sdd-matrix-cell{box-sizing:border-box;width:100%;min-width:92px;padding:7px 6px;border:1px solid var(--dsw-alias-border-l2,#bbb);border-radius:5px;background:transparent;color:inherit;font-size:11px;cursor:pointer}.dsh-sdd-matrix-cell[data-status="not-started"]{cursor:default;color:var(--dsw-alias-label-tertiary,#999)}.dsh-sdd-matrix-cell[data-status="in-progress"]{background:var(--dsw-alias-interactive-bg-hover,#e5e5e5)}.dsh-sdd-matrix-cell[data-status="ready-for-review"]{background:repeating-linear-gradient(90deg,var(--dsw-alias-interactive-bg-hover,#ddd) 0 3px,transparent 3px 6px)}.dsh-sdd-matrix-cell[data-status="completed"]{background:var(--dsw-alias-label-primary,#222);border-color:var(--dsw-alias-label-primary,#222);color:var(--dsw-alias-bg-base,#fff)}.dsh-sdd-matrix-cell[data-status="blocked"]{border:2px solid var(--dsw-alias-label-primary,#222);background:repeating-linear-gradient(135deg,var(--dsw-alias-interactive-bg-hover,#ddd) 0 3px,transparent 3px 7px)}@media(max-width:900px){.dsh-sdd-chart-grid{grid-template-columns:minmax(0,1fr)}}
.dsh-sdd-modal-backdrop{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;background:#0008}.dsh-sdd-modal{box-sizing:border-box;width:min(520px,100%);max-height:min(760px,calc(100vh - 40px));overflow:auto;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:14px;background:var(--dsw-alias-bg-base,#fff);box-shadow:0 20px 60px #0005}.dsh-sdd-modal-header{padding:18px 20px 10px}.dsh-sdd-modal-header h2{margin:0 0 6px;font-size:18px}.dsh-sdd-modal-body{display:flex;flex-direction:column;gap:14px;padding:8px 20px 18px}.dsh-sdd-field{display:flex;flex-direction:column;gap:6px}.dsh-sdd-field>label{font-size:13px;font-weight:600}.dsh-sdd-field textarea{min-height:88px;resize:vertical}.dsh-sdd-field[hidden]{display:none}.dsh-sdd-checkbox{display:grid;grid-template-columns:auto 1fr;align-items:start;gap:9px;padding:10px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px}.dsh-sdd-checkbox input{margin-top:2px}.dsh-sdd-modal-footer{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px;border-top:1px solid var(--dsw-alias-border-l1,#ddd);background:var(--dsw-alias-bg-layer-2,#fafafa)}
.dsh-sdd-template-modal{width:min(900px,100%)}.dsh-sdd-template-preview{display:block;box-sizing:border-box;width:100%;margin:0;padding:16px;max-height:60vh;overflow:auto;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#fafafa);color:inherit;font:12px/1.65 ui-monospace,SFMono-Regular,Consolas,"Liberation Mono",monospace;text-align:left;white-space:pre;word-break:normal;overflow-wrap:normal;tab-size:2;direction:ltr}
.dsh-sdd-manual-items{display:flex;flex-direction:column;gap:10px}.dsh-sdd-manual-item{display:grid;grid-template-columns:minmax(120px,.35fr) minmax(180px,.65fr) auto;gap:8px;padding:10px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#fafafa)}.dsh-sdd-manual-item textarea{grid-column:1/-1;min-height:100px}.dsh-sdd-manual-item button{align-self:start}@media(max-width:650px){.dsh-sdd-manual-item{grid-template-columns:1fr}.dsh-sdd-manual-item textarea{grid-column:1}.dsh-sdd-manual-item button{justify-self:end}}
.dsh-sdd-package-modal{width:min(1120px,100%)}.dsh-sdd-package{display:grid;grid-template-columns:minmax(230px,.32fr) minmax(0,1fr);gap:12px;min-height:480px}.dsh-sdd-file-tree{max-height:62vh;overflow:auto;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;padding:6px;background:var(--dsw-alias-bg-layer-2,#fafafa)}.dsh-sdd-file-row{display:flex;align-items:center;width:100%;gap:6px;padding:7px 8px;border:0;border-radius:6px;background:transparent;color:inherit;text-align:left;cursor:pointer;font:12px ui-monospace,SFMono-Regular,Consolas,monospace}.dsh-sdd-file-row:hover,.dsh-sdd-file-row[data-selected]{background:var(--dsw-alias-interactive-bg-hover,#e8e8e8)}.dsh-sdd-preview-pane{min-width:0}.dsh-sdd-preview-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px}.dsh-sdd-preview-toolbar strong{margin-right:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dsh-sdd-markdown{box-sizing:border-box;max-height:56vh;overflow:auto;padding:18px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;background:var(--dsw-alias-bg-base,#fff);line-height:1.65}.dsh-sdd-markdown h1,.dsh-sdd-markdown h2,.dsh-sdd-markdown h3{margin-top:1.3em}.dsh-sdd-markdown pre,.dsh-sdd-markdown code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.dsh-sdd-markdown pre{overflow:auto;padding:12px;border-radius:7px;background:var(--dsw-alias-bg-layer-2,#f5f5f5)}.dsh-sdd-markdown table{border-collapse:collapse;max-width:100%;display:block;overflow:auto}.dsh-sdd-markdown th,.dsh-sdd-markdown td{border:1px solid var(--dsw-alias-border-l1,#ddd);padding:6px 9px}.dsh-sdd-image-preview{display:flex;align-items:center;justify-content:center;min-height:360px;border:1px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;background:var(--dsw-alias-bg-layer-2,#fafafa)}.dsh-sdd-image-preview img{max-width:100%;max-height:56vh}.dsh-sdd-file-note{padding:30px;text-align:center;border:1px dashed var(--dsw-alias-border-l1,#ddd);border-radius:9px;color:var(--dsw-alias-label-secondary,#666)}@media(max-width:760px){.dsh-sdd-package{grid-template-columns:1fr}.dsh-sdd-file-tree{max-height:220px}}
`;
		async function call(action) {
			const timeout = action.kind === "add-project-repository" || action.kind === "inspect-project-repository" || action.kind === "update-project-repository-branch" ? 75e3 : 2e4;
			return await (await fetch(API_PATH, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(action),
				signal: AbortSignal.timeout(timeout)
			})).json();
		}
		function escapeHtml(value) {
			return value.replace(/[&<>"']/g, (character) => ({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				"\"": "&quot;",
				"'": "&#39;"
			})[character]);
		}
		function markdownHtml(value) {
			return purify.sanitize(k.parse(value, {
				async: false,
				gfm: true
			}), { USE_PROFILES: { html: true } });
		}
		function sidebarRoot() {
			const column = document.querySelector("[data-pane=\"sidebar\"], [class*=\"sidebarCol\"]");
			return column?.querySelector("[class*=\"logoRow\"]")?.parentElement ?? column?.firstElementChild;
		}
		function menuAnchor(root) {
			const button = root.querySelector("button[class*=\"newSession\"]");
			const row = button?.closest("[class*=\"logoRow\"]");
			return (row !== null && row?.parentElement === root ? row : button) ?? void 0;
		}
		function icon(menu) {
			return `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{
				dashboard: "<rect x=\"3\" y=\"3\" width=\"5.5\" height=\"5.5\" rx=\"1\"/><rect x=\"11.5\" y=\"3\" width=\"5.5\" height=\"3.5\" rx=\"1\"/><rect x=\"3\" y=\"11.5\" width=\"5.5\" height=\"5.5\" rx=\"1\"/><rect x=\"11.5\" y=\"9.5\" width=\"5.5\" height=\"7.5\" rx=\"1\"/>",
				requirements: "<path d=\"M6 3.5h6l3 3V16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z\"/><path d=\"M12 3.5V7h3M7.5 10h5M7.5 13h3.5\"/><path d=\"m7.2 15.1.8.8 1.5-1.7\"/>",
				prototype: "<rect x=\"2.75\" y=\"3\" width=\"14.5\" height=\"14\" rx=\"2\"/><path d=\"M3 7h14M7.5 7v10M10 10h4.5M10 13h3M5.1 5h.1\"/>",
				architecture: "<rect x=\"7\" y=\"2.5\" width=\"6\" height=\"4\" rx=\"1\"/><rect x=\"2.5\" y=\"13.5\" width=\"5\" height=\"4\" rx=\"1\"/><rect x=\"12.5\" y=\"13.5\" width=\"5\" height=\"4\" rx=\"1\"/><path d=\"M10 6.5v3M5 13.5v-4h10v4\"/>",
				specification: "<path d=\"M5 3.5h8l2 2V16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z\"/><path d=\"M13 3.5V6h2M8 8.5 6.5 10 8 11.5M12 8.5l1.5 1.5-1.5 1.5M9.5 13.5h3\"/>",
				development: "<circle cx=\"5\" cy=\"5\" r=\"1.75\"/><circle cx=\"5\" cy=\"15\" r=\"1.75\"/><circle cx=\"14.5\" cy=\"6.5\" r=\"1.75\"/><path d=\"M5 6.75v6.5M6.75 5h2a4 4 0 0 1 4 4v1\"/><path d=\"m11.5 13.5 1.7 1.7 3.3-3.7\"/>"
			}[menu]}</svg>`;
		}
		var SddWorkbench = class {
			workspaces;
			sessions;
			state = {
				menu: "dashboard",
				selected: /* @__PURE__ */ new Set(),
				loading: false
			};
			container;
			menuButtons = /* @__PURE__ */ new Map();
			waitObserver;
			workspaceUnsubscribe;
			trackedRuns = /* @__PURE__ */ new Map();
			constructor(workspaces, sessions) {
				this.workspaces = workspaces;
				this.sessions = sessions;
			}
			start() {
				const style = document.createElement("style");
				style.dataset.dshSddStyle = "";
				style.textContent = CSS;
				document.head.appendChild(style);
				this.ensureMounted();
				this.waitObserver = new MutationObserver(() => this.ensureMounted());
				this.waitObserver.observe(document.body, {
					childList: true,
					subtree: true
				});
				this.workspaceUnsubscribe = this.workspaces.list.subscribe(() => {
					if (this.state.workspaceId === void 0) this.chooseDefaultWorkspace();
					this.render();
				});
				this.chooseDefaultWorkspace();
				return () => {
					this.waitObserver?.disconnect();
					this.workspaceUnsubscribe?.();
					this.trackedRuns.forEach((dispose) => dispose());
					this.trackedRuns.clear();
					this.menuButtons.forEach((button) => button.remove());
					this.menuButtons.clear();
					this.container?.remove();
					style.remove();
					document.documentElement.removeAttribute(ACTIVE_ATTR);
				};
			}
			chooseDefaultWorkspace() {
				const snapshot = this.workspaces.list.getSnapshot();
				if (this.state.workspaceId !== void 0 && snapshot.items.some((item) => item.workspaceId === this.state.workspaceId)) return;
				const current = snapshot.items.find((item) => item.sessionIds.includes(this.sessions.list.getSnapshot().current));
				this.state.workspaceId = current?.workspaceId ?? snapshot.recentWorkspaceId ?? snapshot.items[0]?.workspaceId;
			}
			ensureMounted() {
				this.mountMenus();
				if (this.container !== void 0 && this.container.isConnected) return;
				const column = document.querySelector("[data-pane=\"conversation\"], [class*=\"centerCol\"]");
				if (column === null) return;
				this.container = document.createElement("div");
				this.container.dataset.dshSddView = "";
				this.container.dataset.dshPlugin = "e2e-dev-sdd";
				column.appendChild(this.container);
				this.render();
			}
			mountMenus() {
				const root = sidebarRoot();
				if (root === void 0) return;
				const anchor = menuAnchor(root);
				if (anchor === void 0) return;
				let insertBefore = anchor.nextElementSibling;
				MENUS.forEach((menu) => {
					let button = this.menuButtons.get(menu.id);
					if (button === void 0) {
						button = document.createElement("button");
						button.type = "button";
						button.className = "dsh-sdd-menu";
						button.dataset.dshSddMenu = menu.id;
						button.title = menu.label;
						button.innerHTML = `${icon(menu.id)}<span>${menu.label}</span>`;
						button.addEventListener("click", () => this.open(menu.id));
						this.menuButtons.set(menu.id, button);
					}
					if (button.parentElement !== root) root.insertBefore(button, insertBefore);
					insertBefore = button.nextElementSibling;
				});
			}
			open(menu) {
				this.state.menu = menu;
				this.state.selected.clear();
				this.state.targetArtifactUid = void 0;
				document.documentElement.setAttribute(ACTIVE_ATTR, "");
				this.syncMenus();
				this.refresh();
			}
			close() {
				document.documentElement.removeAttribute(ACTIVE_ATTR);
				this.menuButtons.forEach((button) => delete button.dataset.active);
			}
			syncMenus() {
				this.menuButtons.forEach((button, id) => {
					if (document.documentElement.hasAttribute(ACTIVE_ATTR) && id === this.state.menu) button.dataset.active = "true";
					else delete button.dataset.active;
				});
			}
			async refresh() {
				if (this.state.workspaceId === void 0) return this.render();
				this.state.loading = true;
				this.state.error = void 0;
				this.render();
				try {
					const response = await call({
						kind: "snapshot",
						workspaceId: this.state.workspaceId
					});
					if (!response.ok) throw new Error(response.error);
					if (!("snapshot" in response)) throw new Error("Host returned an unexpected response");
					this.state.snapshot = response.snapshot;
					if (this.state.workItemUid === void 0 || !response.snapshot.workItems.some((item) => item.uid === this.state.workItemUid)) {
						const workItem = response.snapshot.workItems.find((item) => item.status !== "completed");
						this.state.workItemUid = workItem?.uid;
						this.state.selected = new Set([workItem?.sourceUid, workItem?.bundleSourceUid].filter((uid) => uid !== void 0));
						this.state.targetArtifactUid = void 0;
					}
					if (this.state.menu !== "dashboard") {
						const selectable = response.snapshot.artifacts.filter((item) => item.workItemUid === this.state.workItemUid && item.stage === this.state.menu && (item.status === "draft" || item.status === "in-review"));
						if (!selectable.some((item) => item.uid === this.state.targetArtifactUid)) {
							const only = selectable.length === 1 ? selectable[0] : void 0;
							this.state.targetArtifactUid = only?.uid;
							if (only !== void 0) this.state.selected = /* @__PURE__ */ new Set([...only.basedOn.map((item) => item.uid), ...only.derivedFrom.map((item) => item.uid)]);
						}
					}
				} catch (error) {
					this.state.error = error instanceof Error ? error.message : String(error);
				} finally {
					this.state.loading = false;
					this.render();
				}
			}
			render() {
				if (this.container === void 0) return;
				const options = this.workspaces.list.getSnapshot().items.map((item) => `<option value="${escapeHtml(item.workspaceId)}"${item.workspaceId === this.state.workspaceId ? " selected" : ""}>${escapeHtml(item.title || item.path)}</option>`).join("");
				const title = this.state.menu === "dashboard" ? "项目看板" : STAGES.find((item) => item.id === this.state.menu).label;
				if (this.state.workspaceId === void 0) {
					this.container.innerHTML = "<div class=\"dsh-sdd-page\"><div class=\"dsh-sdd-empty\">请先在 DSH 中打开一个 Workspace。</div></div>";
					return;
				}
				const snapshot = this.state.snapshot;
				const workItemOptions = snapshot?.workItems.map((item) => `<option value="${escapeHtml(item.uid)}"${item.uid === this.state.workItemUid ? " selected" : ""}>${escapeHtml(item.key)} · ${escapeHtml(item.title)}${item.status === "change-pending" ? " · 有变更" : item.status === "removed-pending" ? " · 已移除" : ""}</option>`).join("") ?? "";
				const workItemSelect = snapshot !== void 0 && snapshot.workItems.length > 0 ? `<select class="dsh-sdd-select" data-action="work-item" title="当前需求工作单元">${workItemOptions}</select>` : "";
				let body = "";
				if (this.state.loading) body = "<div class=\"dsh-sdd-empty\">正在读取 SDD 项目…</div>";
				else if (snapshot?.configuration.status === "missing") body = this.initializationHtml();
				else if (snapshot?.configuration.status === "invalid") body = this.invalidConfigurationHtml(snapshot);
				else if (snapshot !== void 0) body = this.state.menu === "dashboard" ? this.dashboardHtml(snapshot) : this.workbenchHtml(snapshot, this.state.menu);
				this.container.innerHTML = `<div class="dsh-sdd-page"><header class="dsh-sdd-header"><button class="dsh-sdd-button" data-action="close">返回对话</button><h1>${title}</h1><select class="dsh-sdd-select" data-action="workspace">${options}</select>${workItemSelect}<button class="dsh-sdd-button" data-action="refresh">刷新</button></header>${this.state.error ? `<div class="dsh-sdd-error">${escapeHtml(this.state.error)}</div>` : ""}${body}</div>`;
				this.bind();
			}
			initializationHtml() {
				return "<section class=\"dsh-sdd-card\"><h2>初始化 SDD 项目</h2><p>当前目录还不是有效的 SDD 项目。初始化会创建 <code>.sdd/project.yaml</code>、五阶段交付件目录、来源、运行、开发和事件目录，并更新 <code>.gitignore</code>。</p><p class=\"dsh-sdd-muted\">已有业务代码和其他文件不会被修改。</p><button class=\"dsh-sdd-button primary\" data-action=\"initialize\">初始化项目</button></section>";
			}
			invalidConfigurationHtml(snapshot) {
				return `<section class="dsh-sdd-card"><h2>SDD 项目配置不合法</h2><p>检测到 <code>${escapeHtml(snapshot.configuration.path)}</code>，但当前配置不能安全运行。请修复下列问题，或备份旧配置后重新生成默认配置。</p><ul class="dsh-sdd-checks">${snapshot.configuration.errors.map((error) => `<li data-fail>${escapeHtml(error)}</li>`).join("")}</ul><div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="refresh">重新检查</button><button class="dsh-sdd-button primary" data-action="reinitialize">备份并重新初始化</button></div></section>`;
			}
			dashboardHtml(snapshot) {
				const dashboard = snapshot.dashboard;
				const stat = (label, value, note) => `<div class="dsh-sdd-stat"><span class="dsh-sdd-muted">${label}</span><b>${value}</b><span class="dsh-sdd-muted">${note}</span></div>`;
				const workload = dashboard.workload.length === 0 ? stat("工作量", "未配置", "由业务数据适配器提供估算") : `<div class="dsh-sdd-stat"><span class="dsh-sdd-muted">工作量</span><div class="dsh-sdd-workload-list">${dashboard.workload.map((item) => `<div class="dsh-sdd-workload-row" title="${escapeHtml(item.unit)} · 已完成 ${item.completed} / 总计 ${item.total}"><span>${escapeHtml(item.unit)}</span><strong>${item.completed} / ${item.total}</strong></div>`).join("")}</div></div>`;
				const pendingChanges = snapshot.workItems.filter((item) => item.status === "change-pending" || item.status === "removed-pending").length;
				return `<section class="dsh-sdd-card" style="margin-bottom:14px"><h2>需求与缺陷管理</h2><p class="dsh-sdd-muted">统一从业务系统导入或再次同步需求包、缺陷和问题；阶段页面只处理各自的交付流程。</p><div class="dsh-sdd-actions"><button class="dsh-sdd-button primary" data-action="import-source">导入或同步需求/缺陷</button></div></section><div class="dsh-sdd-stats">${stat("总体完成度", `${dashboard.overallCompletion}%`, "五阶段质量门禁平均值")}${stat("需求工作单元", String(snapshot.workItems.length), `待处理变更 ${pendingChanges}`)}${stat("需求", String(dashboard.requirements.total), `已追踪 ${dashboard.requirements.traced}`)}${stat("缺陷", String(dashboard.defects.total), `待处理 ${dashboard.defects.open} · 已解决 ${dashboard.defects.resolved}`)}${stat("交付件", String(dashboard.artifacts.total), `草稿 ${dashboard.artifacts.drafts} · 已接受 ${dashboard.artifacts.accepted}`)}${stat("代码空间", String(dashboard.development.workspaces), `变更文件 ${dashboard.development.changedFiles}`)}${stat("测试", String(dashboard.development.passingTests + dashboard.development.failingTests), `通过 ${dashboard.development.passingTests} · 失败 ${dashboard.development.failingTests}`)}${workload}</div>
      <div class="dsh-sdd-chart-grid">${this.stageFlowHtml(snapshot)}${this.burnupHtml(dashboard.burnup)}</div>
      ${this.deliveryMatrixHtml(snapshot)}
      <div class="dsh-sdd-grid dsh-sdd-dashboard-columns" style="margin-top:14px"><section class="dsh-sdd-card"><h2>质量与追踪</h2><p>来源追踪覆盖率：<strong>${dashboard.traceability}%</strong></p>${dashboard.blockers.length === 0 ? "<div class=\"dsh-sdd-empty\">当前没有结构化阻塞项</div>" : `<ul class="dsh-sdd-checks">${dashboard.blockers.map((item) => `<li data-fail>${escapeHtml(item)}</li>`).join("")}</ul>`}</section><section class="dsh-sdd-card"><h2>最近活动</h2>${dashboard.recentEvents.length === 0 ? "<div class=\"dsh-sdd-empty\">暂无事件</div>" : `<div class="dsh-sdd-list dsh-sdd-scroll-list">${dashboard.recentEvents.slice(0, 10).map((event) => `<div class="dsh-sdd-row"><span></span><span><strong>${escapeHtml(event.subject)}</strong><span class="dsh-sdd-muted">${escapeHtml(event.type)} · ${escapeHtml(event.time)}</span></span></div>`).join("")}</div>`}</section></div>${this.traceabilityHtml(snapshot)}`;
			}
			stageFlowHtml(snapshot) {
				const labels = [
					["not-started", "未开始"],
					["in-progress", "进行中"],
					["ready-for-review", "待评审"],
					["completed", "已验收"],
					["blocked", "阻塞/需复审"]
				];
				const rows = snapshot.dashboard.stageFlow.map((flow) => {
					const stage = STAGES.find((item) => item.id === flow.stage);
					const values = {
						"not-started": flow.notStarted,
						"in-progress": flow.inProgress,
						"ready-for-review": flow.readyForReview,
						completed: flow.completed,
						blocked: flow.blocked
					};
					const count = Object.values(values).reduce((sum, value) => sum + value, 0);
					const scale = Math.max(1, count);
					const segments = labels.map(([status, label]) => values[status] === 0 ? "" : `<span class="dsh-sdd-flow-segment" data-status="${status}" style="width:${values[status] / scale * 100}%" title="${escapeHtml(label)} ${values[status]}"></span>`).join("");
					return `<div class="dsh-sdd-flow-row"><strong>${escapeHtml(stage.label)}</strong><div class="dsh-sdd-flow-bar">${segments}</div><span>${count}</span></div>`;
				}).join("");
				const legend = labels.map(([status, label]) => `<span><i class="dsh-sdd-legend-swatch" data-status="${status}"></i>${escapeHtml(label)}</span>`).join("");
				return `<section class="dsh-sdd-card"><h2>五阶段流转</h2><p class="dsh-sdd-muted">按需求工作单元统计每个阶段的当前交付状态。</p><div class="dsh-sdd-flow-list">${rows || "<div class=\"dsh-sdd-empty\">暂无工作单元</div>"}</div><div class="dsh-sdd-chart-legend">${legend}</div></section>`;
			}
			burnupHtml(points) {
				if (points.length === 0) return "<section class=\"dsh-sdd-card\"><h2>需求燃起图</h2><div class=\"dsh-sdd-empty\">导入需求后开始记录范围与完成趋势。</div></section>";
				const width = 480;
				const height = 230;
				const left = 36;
				const right = 14;
				const top = 14;
				const bottom = 32;
				const chartWidth = width - left - right;
				const chartHeight = height - top - bottom;
				const maximum = Math.max(1, ...points.flatMap((point) => [point.total, point.completed]));
				const x = (index) => left + (points.length === 1 ? chartWidth / 2 : index / (points.length - 1) * chartWidth);
				const y = (value) => 198 - value / maximum * chartHeight;
				const path = (selector) => points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(selector(point)).toFixed(1)}`).join(" ");
				const completedPoints = points.map((point, index) => `<circle class="dsh-sdd-burnup-point" cx="${x(index).toFixed(1)}" cy="${y(point.completed).toFixed(1)}" r="3"><title>${escapeHtml(point.date)} 已完成 ${point.completed} / 范围 ${point.total}</title></circle>`).join("");
				return `<section class="dsh-sdd-card"><h2>需求燃起图</h2><p class="dsh-sdd-muted">虚线为需求范围，实线为开发测试阶段已验收数量。</p><svg class="dsh-sdd-burnup" viewBox="0 0 ${width} ${height}" role="img" aria-label="需求燃起图"><line class="dsh-sdd-burnup-grid" x1="${left}" y1="${top}" x2="${left}" y2="198"/><line class="dsh-sdd-burnup-grid" x1="${left}" y1="198" x2="466" y2="198"/><line class="dsh-sdd-burnup-grid" x1="${left}" y1="${y(maximum)}" x2="466" y2="${y(maximum)}"/><path class="dsh-sdd-burnup-total" d="${path((point) => point.total)}"/><path class="dsh-sdd-burnup-completed" d="${path((point) => point.completed)}"/>${completedPoints}<text x="4" y="${y(maximum) + 4}">${maximum}</text><text x="20" y="202">0</text><text x="${left}" y="${height - 8}">${escapeHtml(points[0].date.slice(5))}</text><text text-anchor="end" x="466" y="${height - 8}">${escapeHtml(points.at(-1).date.slice(5))}</text></svg></section>`;
			}
			deliveryMatrixHtml(snapshot) {
				const labels = {
					"not-started": "未开始",
					"in-progress": "进行中",
					"ready-for-review": "待评审",
					completed: "已验收",
					blocked: "阻塞/需复审"
				};
				const rows = snapshot.dashboard.deliveryMatrix.slice(0, 200).map((row) => `<tr><td><strong class="dsh-sdd-matrix-work" title="${escapeHtml(`${row.key} · ${row.title}`)}">${escapeHtml(row.key)} · ${escapeHtml(row.title)}</strong></td>${row.cells.map((cell) => `<td><button class="dsh-sdd-matrix-cell" data-status="${cell.status}" data-matrix-work-item="${escapeHtml(row.workItemUid)}" data-matrix-stage="${cell.stage}"${cell.artifactUid === void 0 ? "" : ` data-matrix-artifact="${escapeHtml(cell.artifactUid)}"`} title="${escapeHtml(`${labels[cell.status]}${cell.artifactKey === void 0 ? "" : ` · ${cell.artifactKey} v${cell.version}`}`)}">${escapeHtml(labels[cell.status])}</button></td>`).join("")}</tr>`).join("");
				return `<section class="dsh-sdd-card" style="margin-top:14px"><h2>需求交付热力图</h2><p class="dsh-sdd-muted">每行是一条需求，每列是一个 SDD 阶段；点击单元格进入对应工作台。</p>${rows === "" ? "<div class=\"dsh-sdd-empty\">暂无需求工作单元</div>" : `<div class="dsh-sdd-matrix-scroll"><table class="dsh-sdd-matrix"><thead><tr><th>需求工作单元</th>${STAGES.map((stage) => `<th>${escapeHtml(stage.label)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>${snapshot.dashboard.deliveryMatrix.length > 200 ? "<p class=\"dsh-sdd-muted\">当前展示前 200 条，请按工作单元继续查看详细追踪。</p>" : ""}`}</section>`;
			}
			traceabilityHtml(snapshot) {
				const workItem = snapshot.workItems.find((item) => item.uid === this.state.workItemUid);
				if (workItem === void 0) return "";
				const artifacts = snapshot.artifacts.filter((item) => item.workItemUid === workItem.uid && item.status !== "superseded");
				const rows = STAGES.map((stage) => {
					const items = artifacts.filter((item) => item.stage === stage.id);
					const detail = items.length === 0 ? "—" : items.map((item) => `${item.key} v${item.version} (${item.status}) ← ${item.basedOn.map((ref) => artifacts.find((value) => value.uid === ref.uid)?.key ?? ref.uid).join("、") || workItem.key}`).join("；");
					return `<div class="dsh-sdd-row"><span></span><span><strong>${escapeHtml(stage.label)}</strong><span class="dsh-sdd-muted">${escapeHtml(detail)}</span></span></div>`;
				}).join("");
				return `<section class="dsh-sdd-card" style="margin-top:14px"><h2>交付追踪矩阵 · ${escapeHtml(workItem.key)}</h2><p class="dsh-sdd-muted">外部需求、五阶段交付件及其固定上游版本。</p><div class="dsh-sdd-list dsh-sdd-trace-list">${rows}</div></section>`;
			}
			workbenchHtml(snapshot, stage) {
				const workItem = snapshot.workItems.find((item) => item.uid === this.state.workItemUid);
				const accepted = snapshot.artifacts.filter((item) => item.status === "accepted" && item.stage !== stage && item.workItemUid === this.state.workItemUid);
				const current = snapshot.artifacts.filter((item) => item.stage === stage && item.workItemUid === this.state.workItemUid);
				const sourceUids = new Set([workItem?.sourceUid, workItem?.bundleSourceUid].filter((uid) => uid !== void 0));
				const sources = workItem === void 0 ? snapshot.sources.filter((item) => snapshot.workItems.length === 0) : snapshot.sources.filter((item) => sourceUids.has(item.uid));
				const importAction = stage === "requirements" ? "<button class=\"dsh-sdd-button\" data-action=\"import-requirement\">导入或同步需求包</button>" : stage === "development" ? "<button class=\"dsh-sdd-button\" data-action=\"import-defect\">导入或同步缺陷/问题</button>" : "";
				const change = workItem?.change === void 0 ? "" : `<div class="dsh-sdd-error"><strong>${workItem.status === "removed-pending" ? "外部需求已被移除" : "检测到需求变更"}</strong><br>${escapeHtml(workItem.change.changedPaths.join("、") || "外部状态变化")}<br>需要重新评审：${escapeHtml(workItem.change.reviewRequiredStages.map((id) => STAGES.find((stageItem) => stageItem.id === id)?.label ?? id).join("、") || "无")}${workItem.status === "removed-pending" ? "<div class=\"dsh-sdd-actions\"><button class=\"dsh-sdd-button\" data-resolve-removal>处理外部移除</button></div>" : ""}</div>`;
				const noWorkItem = snapshot.workItems.length > 0 && workItem === void 0 ? "<div class=\"dsh-sdd-error\">请先选择一个需求工作单元。</div>" : "";
				const deliverableName = STAGE_ARTIFACT_TEMPLATES[stage].documentName;
				const target = current.find((item) => item.uid === this.state.targetArtifactUid && (item.status === "draft" || item.status === "in-review"));
				const nextStep = current.every((item) => item.status !== "draft" && item.status !== "in-review") ? `下一步：创建“${deliverableName}”草稿，作为 AI 本阶段输出的固定文件。` : target === void 0 ? `下一步：选择一个 ${deliverableName} 草稿。` : `已选择 ${target.key}，可以开始阶段对话。`;
				return `${change}${noWorkItem}${this.stageSettingsHtml(snapshot, stage)}<div class="dsh-sdd-grid"><section class="dsh-sdd-card"><h2>本阶段输入材料</h2><p class="dsh-sdd-muted">这些内容只作为 AI 的输入，不是当前阶段的正式输出。只允许选择当前工作单元的来源和已接受上游交付件。</p><div class="dsh-sdd-list">${accepted.length === 0 && sources.length === 0 ? "<div class=\"dsh-sdd-empty\">暂无可用输入</div>" : accepted.map((item) => this.inputRow(item)).join("") + sources.map((item) => this.sourceRow(item)).join("")}</div>${importAction ? `<div class="dsh-sdd-actions">${importAction}</div>` : ""}</section><section class="dsh-sdd-card"><h2>${escapeHtml(deliverableName)}</h2><p class="dsh-sdd-muted">这是 AI 在当前阶段持续维护并最终验收的正式交付件。页面模板、草稿正文和 AI 输出约束保持一致。</p><div class="dsh-sdd-list">${current.length === 0 ? `<div class="dsh-sdd-empty">尚未创建${escapeHtml(deliverableName)}</div>` : current.map((item) => this.outputRow(item, snapshot)).join("")}</div><div class="dsh-sdd-muted" style="margin-top:12px">${escapeHtml(nextStep)}</div><div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="view-template">查看${escapeHtml(deliverableName)}模板</button><button class="dsh-sdd-button${target === void 0 ? " primary" : ""}" data-action="draft"${snapshot.workItems.length > 0 && workItem === void 0 ? " disabled" : ""}>创建${escapeHtml(deliverableName)}草稿</button><button class="dsh-sdd-button primary" data-action="conversation"${target === void 0 ? " disabled title=\"请先创建或选择本阶段交付件草稿\"" : ""}>开始阶段对话</button></div></section>${stage === "development" ? this.developmentHtml(snapshot) : ""}</div>`;
			}
			stageSettingsHtml(snapshot, stage) {
				const workItem = snapshot.workItems.find((item) => item.uid === this.state.workItemUid);
				if (workItem === void 0 || stage !== "architecture" && stage !== "specification" && stage !== "development") return "";
				const scope = workItem.repositoryScope?.join("、") || "未确认";
				const targets = workItem.developmentTargets?.join("、") || "未确认";
				const openSpecValidation = snapshot.openSpecValidation[workItem.uid];
				const openSpecState = openSpecValidation?.status === "valid" ? "已验证" : openSpecValidation?.status === "invalid" ? `验证失败：${openSpecValidation.message}` : openSpecValidation?.status === "pending" ? "已配置，待开发空间验证" : "已配置，待验证";
				const openSpec = workItem.openSpec?.enabled === true ? `${workItem.openSpec.repositoryId}:${workItem.openSpec.path} · ${openSpecState}` : "本需求未配置";
				if (stage === "architecture") {
					const repositories = snapshot.project?.development.repositories ?? [];
					return `<section class="dsh-sdd-card" style="margin-bottom:14px"><h2>本需求代码仓库范围</h2><p class="dsh-sdd-muted">添加后仓库会立即显示。勾选本需求可能影响的仓库，再在当前页面确认范围。本地路径添加时只校验 Git 仓库和分支，开发阶段创建 Worktree；远程地址添加时只校验分支可访问，开发阶段才 Clone 到需求隔离空间。</p><div class="dsh-sdd-list">${repositories.map((repository) => `<div class="dsh-sdd-row"><input type="checkbox" data-repository-scope="${escapeHtml(repository.id)}"${workItem.repositoryScope?.includes(repository.id) === true ? " checked" : ""}><span><strong>${escapeHtml(repository.id)}</strong><span class="dsh-sdd-muted">${escapeHtml(repository.source)} · 基线 ${escapeHtml(repository.baseBranch)}；开发时自动创建独立特性分支</span></span><span><button class="dsh-sdd-button" data-change-repository-branch="${escapeHtml(repository.id)}">切换基线</button> <button class="dsh-sdd-button" data-remove-repository="${escapeHtml(repository.id)}">移除</button></span></div>`).join("") || "<div class=\"dsh-sdd-empty\">尚未添加项目代码仓库</div>"}</div><div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="add-repository">添加项目代码仓库</button><button class="dsh-sdd-button primary" data-action="configure-scope"${repositories.length === 0 ? " disabled" : ""}>确认当前勾选范围</button></div><p class="dsh-sdd-muted">已确认范围：${escapeHtml(scope)}　开发目标：${escapeHtml(targets)}　OpenSpec：${escapeHtml(openSpec)}</p></section>`;
				}
				const action = stage === "specification" ? "<button class=\"dsh-sdd-button\" data-action=\"configure-targets\">确认开发目标与 OpenSpec</button>" : "";
				return `<section class="dsh-sdd-card" style="margin-bottom:14px"><h2>本需求开发边界</h2><p class="dsh-sdd-muted">系统设计确认仓库范围，规格设计从该范围中确认具体开发目标。未确认时对应阶段不能开始对话或验收。</p><div>仓库范围：<strong>${escapeHtml(scope)}</strong>　开发目标：<strong>${escapeHtml(targets)}</strong>　OpenSpec：<strong>${escapeHtml(openSpec)}</strong></div>${action ? `<div class="dsh-sdd-actions">${action}</div>` : ""}</section>`;
			}
			inputRow(item) {
				return `<label class="dsh-sdd-row"><input type="checkbox" data-input="${escapeHtml(item.uid)}" ${this.state.selected.has(item.uid) ? "checked" : ""}><span><strong>${escapeHtml(item.key)} · ${escapeHtml(item.title)}</strong><span class="dsh-sdd-muted">${escapeHtml(item.stage)} · v${escapeHtml(item.version)} · ${escapeHtml(item.relativeDirectory)}</span></span><span class="dsh-sdd-badge">accepted</span></label>`;
			}
			sourceRow(item) {
				const disabled = item.validationErrors.length > 0 ? " disabled" : "";
				const kindLabels = {
					requirement: "需求",
					defect: "缺陷",
					issue: "问题"
				};
				const provider = item.provider === "command" ? "项目业务适配器" : item.provider;
				const detail = item.validationErrors.length > 0 ? item.validationErrors.join("; ") : `${kindLabels[item.kind] ?? item.kind} · ${provider} · ${item.relativePath}`;
				return `<label class="dsh-sdd-row"><input type="checkbox" data-input="${escapeHtml(item.uid)}"${disabled} ${this.state.selected.has(item.uid) ? "checked" : ""}><span><strong>${escapeHtml(item.externalKey ?? item.uid)} · ${escapeHtml(item.title)}</strong><span class="dsh-sdd-muted">${escapeHtml(detail)}</span></span><span class="dsh-sdd-badge">外部内容</span></label>`;
			}
			outputRow(item, snapshot) {
				const report = snapshot.quality[item.uid];
				const run = snapshot.runs.find((value) => value.artifactUid === item.uid && value.status !== "completed");
				const selectable = item.status === "draft" || item.status === "in-review";
				const checks = report === void 0 ? "" : `<ul class="dsh-sdd-checks">${report.checks.filter((check) => check.status !== "passed").slice(0, 6).map((check) => `<li data-fail>${escapeHtml(check.label)}：${escapeHtml(check.message)}</li>`).join("")}</ul>`;
				const revisionBadge = item.revision === void 0 ? "" : `<span class="dsh-sdd-badge">${item.revision.kind === "upstream" ? "上游变更" : "主动调整"}</span>`;
				return `<div class="dsh-sdd-row">${selectable ? `<input type="radio" name="sdd-target" data-target="${escapeHtml(item.uid)}" ${this.state.targetArtifactUid === item.uid ? "checked" : ""}>` : "<span></span>"}<span><strong>${escapeHtml(item.key)} · ${escapeHtml(item.title)}</strong><span class="dsh-sdd-muted">v${escapeHtml(item.version)} · ${escapeHtml(item.relativeDirectory)}/${escapeHtml(item.entry)} · 文件 ${item.files.length}</span>${checks}<div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-preview-artifact="${escapeHtml(item.uid)}">查看交付包</button><button class="dsh-sdd-button" data-quality="${escapeHtml(item.uid)}">质量检查 ${report?.score ?? 0}%</button>${run?.sessionId ? `<button class="dsh-sdd-button" data-resume="${escapeHtml(run.uid)}">恢复对话</button><button class="dsh-sdd-button" data-sync="${escapeHtml(run.uid)}">同步结论</button>` : ""}${selectable ? `<button class="dsh-sdd-button" data-accept="${escapeHtml(item.uid)}">验收</button><button class="dsh-sdd-button" data-discard="${escapeHtml(item.uid)}">删除草稿</button>` : ""}${item.status === "accepted" ? `<button class="dsh-sdd-button" data-revision="${escapeHtml(item.uid)}">检查变更 / 提出调整</button>` : ""}${run !== void 0 && item.status === "accepted" ? `<button class="dsh-sdd-button" data-complete="${escapeHtml(run.uid)}">完成阶段运行</button>` : ""}</div></span><span><span class="dsh-sdd-badge">${escapeHtml(item.status)}</span>${revisionBadge}${run ? `<span class="dsh-sdd-badge">${escapeHtml(run.status)}</span>` : ""}</span></div>`;
			}
			developmentHtml(snapshot) {
				const artifact = snapshot.artifacts.find((item) => item.uid === this.state.targetArtifactUid);
				if (artifact === void 0) return "<section class=\"dsh-sdd-card dsh-sdd-wide\"><h2>隔离开发空间</h2><div class=\"dsh-sdd-empty\">先选择一个开发测试交付件。</div></section>";
				const workspace = snapshot.developmentWorkspaces.find((item) => item.artifactUid === artifact.uid);
				const workItem = snapshot.workItems.find((item) => item.uid === artifact.workItemUid);
				const targets = new Set(workItem?.developmentTargets ?? []);
				const configured = (snapshot.project?.development.repositories ?? []).filter((item) => artifact.workItemUid === void 0 || targets.has(item.id));
				return `<section class="dsh-sdd-card dsh-sdd-wide"><h2>隔离开发空间 · ${escapeHtml(artifact.key)}</h2>${workspace === void 0 ? `<p class="dsh-sdd-muted">可用代码仓库：${configured.map((item) => `${item.id}（基线 ${item.baseBranch}）`).join("、") || "尚未在 project.yaml 配置 repositories"}。创建后会从所选基线建立独立的 SDD 特性分支。</p><button class="dsh-sdd-button" data-action="development-create">创建 Worktree / Clone 与特性分支</button>` : `<div class="dsh-sdd-list">${workspace.repositories.map((repo) => `<div class="dsh-sdd-row"><span></span><span><strong>${escapeHtml(repo.id)} · 特性分支 ${escapeHtml(repo.workingBranch)}</strong><span class="dsh-sdd-muted">基线 ${escapeHtml(repo.baseBranch)} @ ${escapeHtml(repo.baseCommit.slice(0, 8))}<br>${escapeHtml(repo.path)}<br>变更 ${repo.changedFiles} · ahead ${repo.ahead} · behind ${repo.behind}${repo.lastTest ? ` · 测试 ${repo.lastTest.passed ? "通过" : "失败"}` : ""}</span></span><span><button class="dsh-sdd-button" data-dev-test="${escapeHtml(repo.id)}">运行测试</button><button class="dsh-sdd-button" data-dev-commit="${escapeHtml(repo.id)}">提交代码</button></span></div>`).join("")}</div><p class="dsh-sdd-muted">插件只在特性分支提交代码；推送、创建合并请求并合入基线分支由负责人显式执行，避免自动改写主分支。</p><div class="dsh-sdd-actions"><button class="dsh-sdd-button" data-action="development-create">添加仓库</button><button class="dsh-sdd-button" data-action="development-status">刷新 Git 状态</button></div>`}</section>`;
			}
			bind() {
				const root = this.container;
				root.querySelector("[data-action=\"close\"]")?.addEventListener("click", () => this.close());
				root.querySelectorAll("[data-action=\"refresh\"]").forEach((button) => button.addEventListener("click", () => {
					this.refresh();
				}));
				root.querySelector("[data-action=\"workspace\"]")?.addEventListener("change", (event) => {
					this.state.workspaceId = event.currentTarget.value;
					this.state.workItemUid = void 0;
					this.state.selected.clear();
					this.state.targetArtifactUid = void 0;
					this.refresh();
				});
				root.querySelector("[data-action=\"work-item\"]")?.addEventListener("change", (event) => {
					this.state.workItemUid = event.currentTarget.value;
					const workItem = this.state.snapshot?.workItems.find((item) => item.uid === this.state.workItemUid);
					this.state.selected = new Set([workItem?.sourceUid, workItem?.bundleSourceUid].filter((uid) => uid !== void 0));
					this.state.targetArtifactUid = void 0;
					this.render();
				});
				root.querySelector("[data-action=\"initialize\"]")?.addEventListener("click", () => {
					this.mutate({
						kind: "initialize",
						workspaceId: this.state.workspaceId
					});
				});
				root.querySelector("[data-action=\"draft\"]")?.addEventListener("click", () => {
					this.createDraft();
				});
				root.querySelector("[data-action=\"import-source\"]")?.addEventListener("click", () => {
					this.importSource();
				});
				root.querySelector("[data-action=\"import-requirement\"]")?.addEventListener("click", () => {
					this.importSource("requirement");
				});
				root.querySelector("[data-action=\"import-defect\"]")?.addEventListener("click", () => {
					this.importSource("defect");
				});
				root.querySelector("[data-action=\"conversation\"]")?.addEventListener("click", () => {
					this.startConversation();
				});
				root.querySelector("[data-action=\"view-template\"]")?.addEventListener("click", () => this.showTemplate());
				root.querySelector("[data-action=\"configure-scope\"]")?.addEventListener("click", () => {
					this.configureRepositoryScope();
				});
				root.querySelector("[data-action=\"add-repository\"]")?.addEventListener("click", () => {
					this.addProjectRepository();
				});
				root.querySelectorAll("[data-remove-repository]").forEach((button) => button.addEventListener("click", () => {
					this.removeProjectRepository(button.dataset.removeRepository);
				}));
				root.querySelectorAll("[data-change-repository-branch]").forEach((button) => button.addEventListener("click", () => {
					this.changeProjectRepositoryBranch(button.dataset.changeRepositoryBranch);
				}));
				root.querySelector("[data-action=\"configure-targets\"]")?.addEventListener("click", () => {
					this.configureDevelopmentTargets();
				});
				root.querySelector("[data-action=\"reinitialize\"]")?.addEventListener("click", () => {
					this.reinitialize();
				});
				root.querySelectorAll("[data-input]").forEach((input) => input.addEventListener("change", () => {
					const uid = input.dataset.input;
					if (input.checked) this.state.selected.add(uid);
					else this.state.selected.delete(uid);
				}));
				root.querySelectorAll("[data-target]").forEach((input) => input.addEventListener("change", () => {
					this.state.targetArtifactUid = input.dataset.target;
					const artifact = this.state.snapshot?.artifacts.find((item) => item.uid === input.dataset.target);
					this.state.selected = /* @__PURE__ */ new Set([...artifact?.basedOn.map((item) => item.uid) ?? [], ...artifact?.derivedFrom.map((item) => item.uid) ?? []]);
					this.render();
				}));
				root.querySelectorAll("[data-quality]").forEach((button) => button.addEventListener("click", () => {
					this.mutate({
						kind: "quality",
						workspaceId: this.state.workspaceId,
						artifactUid: button.dataset.quality
					});
				}));
				root.querySelectorAll("[data-preview-artifact]").forEach((button) => button.addEventListener("click", () => {
					this.showArtifact(button.dataset.previewArtifact);
				}));
				root.querySelectorAll("[data-revision]").forEach((button) => button.addEventListener("click", () => {
					this.createRevision(button.dataset.revision);
				}));
				root.querySelectorAll("[data-discard]").forEach((button) => button.addEventListener("click", () => {
					this.discardDraft(button.dataset.discard);
				}));
				root.querySelectorAll("[data-accept]").forEach((button) => button.addEventListener("click", () => {
					this.accept(button.dataset.accept);
				}));
				root.querySelectorAll("[data-resume]").forEach((button) => button.addEventListener("click", () => {
					this.resumeRun(button.dataset.resume, false);
				}));
				root.querySelectorAll("[data-sync]").forEach((button) => button.addEventListener("click", () => {
					this.resumeRun(button.dataset.sync, true);
				}));
				root.querySelectorAll("[data-complete]").forEach((button) => button.addEventListener("click", () => {
					this.mutate({
						kind: "complete-run",
						workspaceId: this.state.workspaceId,
						runUid: button.dataset.complete
					});
				}));
				root.querySelector("[data-action=\"development-create\"]")?.addEventListener("click", () => {
					this.createDevelopment();
				});
				root.querySelector("[data-action=\"development-status\"]")?.addEventListener("click", () => {
					if (this.state.targetArtifactUid) this.mutate({
						kind: "development-status",
						workspaceId: this.state.workspaceId,
						artifactUid: this.state.targetArtifactUid
					});
				});
				root.querySelectorAll("[data-dev-test]").forEach((button) => button.addEventListener("click", () => {
					this.runTest(button.dataset.devTest);
				}));
				root.querySelectorAll("[data-dev-commit]").forEach((button) => button.addEventListener("click", () => {
					this.commit(button.dataset.devCommit);
				}));
				root.querySelector("[data-resolve-removal]")?.addEventListener("click", () => {
					this.resolveRemoval();
				});
				root.querySelectorAll("[data-matrix-work-item]").forEach((button) => button.addEventListener("click", () => {
					this.state.workItemUid = button.dataset.matrixWorkItem;
					this.state.menu = button.dataset.matrixStage;
					this.state.targetArtifactUid = button.dataset.matrixArtifact;
					const artifact = this.state.snapshot?.artifacts.find((item) => item.uid === this.state.targetArtifactUid);
					const workItem = this.state.snapshot?.workItems.find((item) => item.uid === this.state.workItemUid);
					this.state.selected = new Set(artifact === void 0 ? [workItem?.sourceUid, workItem?.bundleSourceUid].filter((uid) => uid !== void 0) : [...artifact.basedOn.map((item) => item.uid), ...artifact.derivedFrom.map((item) => item.uid)]);
					this.syncMenus();
					this.render();
				}));
			}
			async showTemplate() {
				if (this.state.menu === "dashboard") return;
				const stage = STAGES.find((item) => item.id === this.state.menu);
				try {
					const response = await call({
						kind: "read-stage-template",
						workspaceId: this.state.workspaceId,
						stage: stage.id
					});
					if (!response.ok) throw new Error(response.error);
					if (!("template" in response)) throw new Error("Host returned an unexpected template preview");
					const template = response.template;
					const backdrop = document.createElement("div");
					backdrop.className = "dsh-sdd-modal-backdrop";
					backdrop.innerHTML = `<section class="dsh-sdd-modal dsh-sdd-package-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(stage.label)}交付件模板"><header class="dsh-sdd-modal-header"><h2>${escapeHtml(stage.label)} · ${escapeHtml(template.documentName)}</h2><p class="dsh-sdd-muted">项目模板 ${escapeHtml(template.contentPath)} · v${escapeHtml(template.version)} · ${escapeHtml(template.contentHash)}</p></header><div class="dsh-sdd-modal-body"><div class="dsh-sdd-preview-toolbar"><strong>${escapeHtml(template.contentPath)}</strong><button class="dsh-sdd-button" data-template-mode="preview">预览</button><button class="dsh-sdd-button primary" data-template-mode="source">源码</button><button class="dsh-sdd-button" data-template-open="content">系统打开模板</button><button class="dsh-sdd-button" data-template-open="config">打开规则</button><button class="dsh-sdd-button" data-template-open="directory">打开模板目录</button></div><div data-template-preview></div><p class="dsh-sdd-muted">必填二级章节：${escapeHtml(template.requiredSections.join("、"))}。修改项目模板只影响之后创建的草稿；已有交付件继续使用自身模板快照。</p></div><footer class="dsh-sdd-modal-footer"><button class="dsh-sdd-button primary" type="button" data-template-close>关闭</button></footer></section>`;
					this.container.appendChild(backdrop);
					const preview = backdrop.querySelector("[data-template-preview]");
					const render = (mode) => {
						preview.innerHTML = mode === "preview" ? `<article class="dsh-sdd-markdown">${markdownHtml(template.content)}</article>` : `<pre class="dsh-sdd-template-preview">${escapeHtml(template.content)}</pre>`;
						backdrop.querySelectorAll("[data-template-mode]").forEach((button) => button.classList.toggle("primary", button.dataset.templateMode === mode));
					};
					render("source");
					backdrop.querySelectorAll("[data-template-mode]").forEach((button) => button.addEventListener("click", () => render(button.dataset.templateMode)));
					backdrop.querySelectorAll("[data-template-open]").forEach((button) => button.addEventListener("click", () => {
						this.openTemplatePath(template, button.dataset.templateOpen);
					}));
					const close = () => backdrop.remove();
					backdrop.querySelector("[data-template-close]").addEventListener("click", close);
					backdrop.addEventListener("click", (event) => {
						if (event.target === backdrop) close();
					});
				} catch (error) {
					this.state.error = error instanceof Error ? error.message : String(error);
					this.render();
				}
			}
			async openTemplatePath(template, target) {
				const response = await call({
					kind: "open-stage-template",
					workspaceId: this.state.workspaceId,
					stage: template.stage,
					target
				});
				if (!response.ok) {
					this.state.error = response.error;
					this.render();
				}
			}
			async showArtifact(artifactUid) {
				const artifact = this.state.snapshot?.artifacts.find((item) => item.uid === artifactUid);
				if (artifact === void 0) return;
				try {
					const files = [{
						path: "manifest.yaml",
						kind: "manifest",
						size: 0
					}, ...artifact.files];
					const rows = [...[...new Set(files.flatMap((file) => {
						const parts = file.path.split("/");
						return parts.slice(0, -1).map((_part, index) => parts.slice(0, index + 1).join("/"));
					}))].sort().map((path) => ({
						path,
						directory: true,
						kind: "directory",
						size: 0
					})), ...files.map((file) => ({
						...file,
						directory: false
					}))].sort((left, right) => left.path.localeCompare(right.path) || Number(right.directory) - Number(left.directory)).map((item) => `<button class="dsh-sdd-file-row" style="padding-left:${8 + (item.path.split("/").length - 1) * 14}px" data-${item.directory ? "artifact-directory" : "artifact-file"}="${escapeHtml(item.path)}"><span>${item.directory ? "📁" : item.kind === "markdown" ? "Ⓜ" : item.kind === "image" ? "▣" : item.kind === "binary" ? "◆" : "▤"}</span><span>${escapeHtml(item.path.split("/").pop())}</span>${item.directory ? "" : `<span class="dsh-sdd-muted">${item.size} B</span>`}</button>`).join("");
					const backdrop = document.createElement("div");
					backdrop.className = "dsh-sdd-modal-backdrop";
					backdrop.innerHTML = `<section class="dsh-sdd-modal dsh-sdd-package-modal" role="dialog" aria-modal="true"><header class="dsh-sdd-modal-header"><h2>${escapeHtml(artifact.key)} · v${escapeHtml(artifact.version)}</h2><p class="dsh-sdd-muted">${escapeHtml(artifact.relativeDirectory)} · ${files.length} 个文件 · 整包哈希 ${escapeHtml(artifact.contentHash ?? "尚未冻结")}</p></header><div class="dsh-sdd-modal-body"><div class="dsh-sdd-preview-toolbar"><button class="dsh-sdd-button" data-artifact-open-root>使用系统工具打开交付包目录</button></div><div class="dsh-sdd-package"><nav class="dsh-sdd-file-tree" aria-label="交付包文件">${rows}</nav><section class="dsh-sdd-preview-pane"><div class="dsh-sdd-preview-toolbar"><strong data-artifact-current>请选择文件</strong><button class="dsh-sdd-button" data-artifact-mode="preview">预览</button><button class="dsh-sdd-button" data-artifact-mode="source">源码</button><button class="dsh-sdd-button" data-artifact-open-file disabled>使用系统工具打开</button></div><div data-artifact-preview><div class="dsh-sdd-file-note">请选择左侧文件。</div></div></section></div></div><footer class="dsh-sdd-modal-footer"><button class="dsh-sdd-button primary" type="button" data-artifact-close>关闭</button></footer></section>`;
					this.container.appendChild(backdrop);
					const preview = backdrop.querySelector("[data-artifact-preview]");
					const current = backdrop.querySelector("[data-artifact-current]");
					const openFile = backdrop.querySelector("[data-artifact-open-file]");
					let selectedPath = "";
					let selectedFile;
					let mode = "preview";
					const render = () => {
						if (selectedFile === void 0) return;
						const markdown = selectedFile.kind === "markdown";
						backdrop.querySelectorAll("[data-artifact-mode]").forEach((button) => {
							button.hidden = !markdown;
							button.classList.toggle("primary", button.dataset.artifactMode === mode);
						});
						if (selectedFile.kind === "image") preview.innerHTML = `<div class="dsh-sdd-image-preview"><img src="${escapeHtml(selectedFile.dataUrl ?? "")}" alt="${escapeHtml(selectedPath)}"></div>`;
						else if (selectedFile.kind === "binary") preview.innerHTML = "<div class=\"dsh-sdd-file-note\">该文件不能在浏览器中安全预览，请使用系统默认应用打开。</div>";
						else if (markdown && mode === "preview") preview.innerHTML = `<article class="dsh-sdd-markdown">${markdownHtml(selectedFile.content ?? "")}</article>`;
						else preview.innerHTML = `<pre class="dsh-sdd-template-preview">${escapeHtml(selectedFile.content ?? "")}</pre>`;
					};
					const selectFile = async (path) => {
						const response = await call({
							kind: "read-artifact-file",
							workspaceId: this.state.workspaceId,
							artifactUid,
							path
						});
						if (!response.ok) throw new Error(response.error);
						if (!("artifactFile" in response)) throw new Error("Host returned an unexpected artifact preview");
						selectedPath = path;
						selectedFile = response.artifactFile;
						mode = "preview";
						current.textContent = path;
						openFile.disabled = false;
						backdrop.querySelectorAll("[data-artifact-file]").forEach((row) => row.toggleAttribute("data-selected", row.dataset.artifactFile === path));
						render();
					};
					const openPath = async (path) => {
						const response = await call({
							kind: "open-artifact-path",
							workspaceId: this.state.workspaceId,
							artifactUid,
							path
						});
						if (!response.ok) throw new Error(response.error);
					};
					backdrop.querySelectorAll("[data-artifact-file]").forEach((button) => button.addEventListener("click", () => {
						selectFile(button.dataset.artifactFile).catch((error) => {
							this.state.error = String(error);
							this.render();
						});
					}));
					backdrop.querySelectorAll("[data-artifact-directory]").forEach((button) => button.addEventListener("click", () => {
						openPath(button.dataset.artifactDirectory).catch((error) => {
							this.state.error = String(error);
							this.render();
						});
					}));
					backdrop.querySelectorAll("[data-artifact-mode]").forEach((button) => button.addEventListener("click", () => {
						mode = button.dataset.artifactMode;
						render();
					}));
					backdrop.querySelector("[data-artifact-open-root]").addEventListener("click", () => {
						openPath("").catch((error) => {
							this.state.error = String(error);
							this.render();
						});
					});
					openFile.addEventListener("click", () => {
						openPath(selectedPath).catch((error) => {
							this.state.error = String(error);
							this.render();
						});
					});
					const close = () => backdrop.remove();
					backdrop.querySelector("[data-artifact-close]").addEventListener("click", close);
					backdrop.addEventListener("click", (event) => {
						if (event.target === backdrop) close();
					});
					await selectFile(artifact.entry);
				} catch (error) {
					this.state.error = error instanceof Error ? error.message : String(error);
					this.render();
				}
			}
			async configureRepositoryScope() {
				const snapshot = this.state.snapshot;
				const workItem = snapshot?.workItems.find((item) => item.uid === this.state.workItemUid);
				if (snapshot?.project === void 0 || workItem === void 0) return;
				if (snapshot.project.development.repositories.length === 0) {
					this.state.error = "请先添加项目代码仓库";
					return this.render();
				}
				const repositoryScope = [...this.container?.querySelectorAll("[data-repository-scope]:checked") ?? []].map((input) => input.dataset.repositoryScope);
				const developmentTargets = (workItem.developmentTargets ?? []).filter((id) => repositoryScope.includes(id));
				await this.mutate({
					kind: "update-work-item-settings",
					workspaceId: this.state.workspaceId,
					workItemUid: workItem.uid,
					repositoryScope,
					developmentTargets,
					openSpec: developmentTargets.includes(workItem.openSpec?.repositoryId ?? "") ? workItem.openSpec : { enabled: false }
				});
			}
			async addProjectRepository() {
				const values = await this.openForm({
					title: "添加项目代码仓库",
					description: "先读取本地或远程仓库已有分支，不复制或下载代码。下一步选择开发基线；开发阶段再从该基线创建需求专属特性分支。",
					submitLabel: "读取已有分支",
					fields: [{
						name: "id",
						label: "仓库标识",
						type: "text",
						required: true,
						placeholder: "例如：payment-web"
					}, {
						name: "source",
						label: "本地路径或 Git 地址",
						type: "text",
						required: true,
						placeholder: "例如：git@github.com:company/payment-web.git"
					}]
				});
				if (values === void 0) return;
				const inspection = await this.inspectProjectRepository(String(values.source));
				if (inspection === void 0) return;
				const branchValues = await this.openForm({
					title: `选择基线分支 · ${String(values.id)}`,
					description: `已读取 ${inspection.sourceKind === "local" ? "本地" : "远程"}仓库的 ${inspection.branches.length} 个分支。开发阶段会从所选基线创建新的 SDD 特性分支，不会直接修改基线分支。`,
					submitLabel: "添加仓库",
					fields: [{
						name: "baseBranch",
						label: "基线分支",
						type: "select",
						required: true,
						value: inspection.defaultBranch,
						options: inspection.branches.map((branch) => ({
							value: branch,
							label: branch
						}))
					}]
				});
				if (branchValues === void 0) return;
				await this.mutate({
					kind: "add-project-repository",
					workspaceId: this.state.workspaceId,
					id: String(values.id),
					source: inspection.source,
					baseBranch: String(branchValues.baseBranch)
				});
			}
			async inspectProjectRepository(source) {
				try {
					const response = await call({
						kind: "inspect-project-repository",
						workspaceId: this.state.workspaceId,
						source
					});
					if (!response.ok) throw new Error(response.error);
					if (!("repositoryInspection" in response)) throw new Error("Host returned an unexpected repository inspection");
					return response.repositoryInspection;
				} catch (error) {
					this.state.error = error instanceof Error ? error.message : String(error);
					this.render();
					return;
				}
			}
			async changeProjectRepositoryBranch(id) {
				const repository = this.state.snapshot?.project?.development.repositories.find((item) => item.id === id);
				if (repository === void 0) return;
				const inspection = await this.inspectProjectRepository(repository.source);
				if (inspection === void 0) return;
				const values = await this.openForm({
					title: `切换基线分支 · ${id}`,
					description: "只影响之后创建的隔离开发空间；已经创建开发空间时系统会拒绝切换，以免基线记录与真实代码不一致。",
					submitLabel: "保存基线分支",
					fields: [{
						name: "baseBranch",
						label: "基线分支",
						type: "select",
						required: true,
						value: inspection.branches.includes(repository.baseBranch) ? repository.baseBranch : inspection.defaultBranch,
						options: inspection.branches.map((branch) => ({
							value: branch,
							label: branch
						}))
					}]
				});
				if (values === void 0 || values.baseBranch === repository.baseBranch) return;
				await this.mutate({
					kind: "update-project-repository-branch",
					workspaceId: this.state.workspaceId,
					id,
					baseBranch: String(values.baseBranch)
				});
			}
			async removeProjectRepository(id) {
				if ((await this.openForm({
					title: `移除项目代码仓库 · ${id}`,
					description: "只移除 SDD 项目配置，不会删除本地或远程代码仓库。所有需求中对它的仓库范围、开发目标和 OpenSpec 关联也会一并清除。已创建隔离开发空间时不允许移除。",
					submitLabel: "确认移除",
					fields: [{
						name: "confirmed",
						label: "我确认从项目配置中移除此仓库",
						type: "checkbox",
						required: true
					}]
				}))?.confirmed !== true) return;
				await this.mutate({
					kind: "remove-project-repository",
					workspaceId: this.state.workspaceId,
					id
				});
			}
			async discardDraft(artifactUid) {
				const artifact = this.state.snapshot?.artifacts.find((item) => item.uid === artifactUid);
				if (artifact === void 0) return;
				if ((await this.openForm({
					title: `删除草稿 · ${artifact.key} v${artifact.version}`,
					description: "草稿交付包及其阶段运行记录会移入 .sdd/trash，可从文件仓库恢复；已验收的上一版本不会受影响。已创建代码开发空间时不允许删除。",
					submitLabel: "移入回收目录",
					fields: [{
						name: "confirmed",
						label: "我确认删除这个草稿修订",
						type: "checkbox",
						required: true
					}]
				}))?.confirmed !== true) return;
				if (this.state.targetArtifactUid === artifactUid) this.state.targetArtifactUid = void 0;
				await this.mutate({
					kind: "discard-draft",
					workspaceId: this.state.workspaceId,
					artifactUid
				});
			}
			async configureDevelopmentTargets() {
				const snapshot = this.state.snapshot;
				const workItem = snapshot?.workItems.find((item) => item.uid === this.state.workItemUid);
				if (snapshot?.project === void 0 || workItem === void 0) return;
				const scope = snapshot.project.development.repositories.filter((repository) => workItem.repositoryScope?.includes(repository.id));
				if (scope.length === 0) {
					this.state.error = "请先在系统设计阶段确认代码仓库范围";
					return this.render();
				}
				const values = await this.openForm({
					title: `确认开发目标 · ${workItem.key}`,
					description: "选择本需求实际修改的仓库。OpenSpec 可选，路径相对于所选代码仓库。",
					submitLabel: "保存开发目标",
					fields: [
						...scope.map((repository) => ({
							name: `target-${repository.id}`,
							label: `${repository.id} · ${repository.source}`,
							type: "checkbox",
							value: workItem.developmentTargets?.includes(repository.id) === true
						})),
						{
							name: "openSpecEnabled",
							label: "在目标代码仓库中使用 OpenSpec",
							type: "checkbox",
							value: workItem.openSpec?.enabled === true
						},
						{
							name: "openSpecRepository",
							label: "OpenSpec 所在仓库",
							type: "select",
							value: workItem.openSpec?.repositoryId ?? scope[0].id,
							options: scope.map((repository) => ({
								value: repository.id,
								label: repository.id
							}))
						},
						{
							name: "openSpecPath",
							label: "OpenSpec 相对路径",
							type: "text",
							value: workItem.openSpec?.path ?? "openspec",
							placeholder: "例如：openspec"
						}
					]
				});
				if (values === void 0) return;
				const developmentTargets = scope.filter((repository) => values[`target-${repository.id}`] === true).map((repository) => repository.id);
				await this.mutate({
					kind: "update-work-item-settings",
					workspaceId: this.state.workspaceId,
					workItemUid: workItem.uid,
					repositoryScope: workItem.repositoryScope ?? [],
					developmentTargets,
					openSpec: values.openSpecEnabled === true ? {
						enabled: true,
						repositoryId: String(values.openSpecRepository),
						path: String(values.openSpecPath)
					} : { enabled: false }
				});
			}
			openForm(config) {
				return new Promise((resolve) => {
					const backdrop = document.createElement("div");
					backdrop.className = "dsh-sdd-modal-backdrop";
					const fieldHtml = config.fields.map((field) => {
						const required = field.required ? " required" : "";
						const show = field.showWhen === void 0 ? "" : ` data-show-field="${escapeHtml(field.showWhen.field)}" data-show-value="${escapeHtml(field.showWhen.value)}"`;
						const help = field.help === void 0 ? "" : `<span class="dsh-sdd-muted">${escapeHtml(field.help)}</span>`;
						if (field.type === "manual-items") return `<div class="dsh-sdd-field"${show}><label>${escapeHtml(field.label)}</label>${help}<div class="dsh-sdd-manual-items" data-manual-items="${escapeHtml(field.name)}"></div><button class="dsh-sdd-button" type="button" data-add-manual-item="${escapeHtml(field.name)}">＋ 添加子需求</button></div>`;
						if (field.type === "checkbox") return `<div class="dsh-sdd-field"${show}><label class="dsh-sdd-checkbox"><input type="checkbox" name="${escapeHtml(field.name)}"${field.value === true ? " checked" : ""}${required}><span>${escapeHtml(field.label)}${help}</span></label></div>`;
						const control = field.type === "select" ? `<select class="dsh-sdd-select" name="${escapeHtml(field.name)}"${required}>${(field.options ?? []).map((option) => `<option value="${escapeHtml(option.value)}"${option.value === field.value ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select>` : field.type === "textarea" ? `<textarea class="dsh-sdd-input" name="${escapeHtml(field.name)}" placeholder="${escapeHtml(field.placeholder ?? "")}"${required}>${escapeHtml(typeof field.value === "string" ? field.value : "")}</textarea>` : `<input class="dsh-sdd-input" name="${escapeHtml(field.name)}" value="${escapeHtml(typeof field.value === "string" ? field.value : "")}" placeholder="${escapeHtml(field.placeholder ?? "")}"${required}>`;
						return `<div class="dsh-sdd-field"${show}><label>${escapeHtml(field.label)}</label>${control}${help}</div>`;
					}).join("");
					backdrop.innerHTML = `<form class="dsh-sdd-modal"><header class="dsh-sdd-modal-header"><h2>${escapeHtml(config.title)}</h2>${config.description ? `<p class="dsh-sdd-muted">${escapeHtml(config.description)}</p>` : ""}</header><div class="dsh-sdd-modal-body">${fieldHtml}</div><footer class="dsh-sdd-modal-footer"><button class="dsh-sdd-button" type="button" data-dialog-cancel>取消</button><button class="dsh-sdd-button primary" type="submit">${escapeHtml(config.submitLabel)}</button></footer></form>`;
					this.container.appendChild(backdrop);
					const form = backdrop.querySelector("form");
					const close = (value) => {
						backdrop.remove();
						resolve(value);
					};
					const rowError = (group, message) => {
						if (group === null || group === void 0) return;
						group.querySelector("[data-manual-error]")?.remove();
						const error = document.createElement("div");
						error.className = "dsh-sdd-error";
						error.dataset.manualError = "";
						error.textContent = message;
						group.appendChild(error);
					};
					const addManualItem = (name) => {
						const list = backdrop.querySelector(`[data-manual-items="${name}"]`);
						if (list === null) return;
						const row = document.createElement("div");
						row.className = "dsh-sdd-manual-item";
						row.innerHTML = `<input class="dsh-sdd-input" data-manual-key placeholder="子需求编号（可留空）"><input class="dsh-sdd-input" data-manual-title placeholder="子需求标题"><button class="dsh-sdd-button" type="button" data-remove-manual-item>删除</button><textarea class="dsh-sdd-input" data-manual-description placeholder="详细描述业务背景、场景、规则、边界、异常、验收想法等；可以输入多行长文本。"></textarea>`;
						list.appendChild(row);
						row.querySelector("[data-remove-manual-item]").addEventListener("click", () => row.remove());
						row.querySelector("[data-manual-title]").focus();
						updateVisibility();
					};
					const updateVisibility = () => {
						backdrop.querySelectorAll("[data-show-field]").forEach((group) => {
							const visible = form.elements.namedItem(group.dataset.showField)?.value === group.dataset.showValue;
							group.hidden = !visible;
							group.querySelectorAll("input,select,textarea").forEach((control) => {
								control.disabled = !visible;
							});
						});
					};
					form.addEventListener("change", updateVisibility);
					backdrop.querySelectorAll("[data-add-manual-item]").forEach((button) => button.addEventListener("click", () => addManualItem(button.dataset.addManualItem)));
					form.addEventListener("submit", (event) => {
						event.preventDefault();
						if (!form.reportValidity()) return;
						const values = {};
						for (const field of config.fields) {
							if (field.type === "manual-items") {
								const group = backdrop.querySelector(`[data-manual-items="${field.name}"]`)?.closest(".dsh-sdd-field");
								if (group?.hidden === true) continue;
								group?.querySelector("[data-manual-error]")?.remove();
								const items = [...group?.querySelectorAll(".dsh-sdd-manual-item") ?? []].map((row) => ({
									key: row.querySelector("[data-manual-key]").value.trim() || void 0,
									title: row.querySelector("[data-manual-title]").value.trim(),
									description: row.querySelector("[data-manual-description]").value.trim() || void 0
								})).filter((item) => item.key !== void 0 || item.title !== "" || item.description !== void 0);
								if (items.some((item) => item.title === "")) {
									rowError(group, "每个子需求都必须填写标题");
									return;
								}
								values[field.name] = JSON.stringify(items);
								continue;
							}
							const control = form.elements.namedItem(field.name);
							if (control === null || control.disabled) continue;
							values[field.name] = field.type === "checkbox" ? control.checked : control.value.trim();
						}
						close(values);
					});
					backdrop.querySelector("[data-dialog-cancel]").addEventListener("click", () => close(void 0));
					backdrop.addEventListener("click", (event) => {
						if (event.target === backdrop) close(void 0);
					});
					updateVisibility();
					window.setTimeout(() => backdrop.querySelector("input:not([type=\"checkbox\"]),select,textarea")?.focus(), 0);
				});
			}
			async reinitialize() {
				if (await this.openForm({
					title: "重新初始化 SDD 项目",
					description: "现有 project.yaml 会先保存为带时间戳的备份，然后生成默认配置。交付件和业务代码不会删除。",
					submitLabel: "备份并重新初始化",
					fields: []
				}) !== void 0) await this.mutate({
					kind: "reinitialize",
					workspaceId: this.state.workspaceId
				});
			}
			async mutate(action) {
				this.state.loading = true;
				this.state.error = void 0;
				this.render();
				try {
					const response = await call(action);
					if (!response.ok) throw new Error(response.error);
					if ("snapshot" in response) this.state.snapshot = response.snapshot;
				} catch (error) {
					this.state.error = error instanceof Error ? error.message : String(error);
				} finally {
					this.state.loading = false;
					this.render();
				}
			}
			async createDraft() {
				if (this.state.menu === "dashboard") return;
				const stage = STAGES.find((item) => item.id === this.state.menu);
				const deliverableName = STAGE_ARTIFACT_TEMPLATES[this.state.menu].documentName;
				const nextDefaultKey = `${stage.prefix}-${String((this.state.snapshot?.artifacts.reduce((largest, item) => {
					const match = new RegExp(`^${stage.prefix}-(\\d+)$`).exec(item.key);
					return match === null ? largest : Math.max(largest, Number(match[1]));
				}, 0) ?? 0) + 1).padStart(4, "0")}`;
				const values = await this.openForm({
					title: `创建${deliverableName}草稿`,
					description: `插件将自动分配交付件编号 ${nextDefaultKey}。企业需求号、缺陷号等外部编号通过输入材料和追踪关系关联，不会替换该编号。当前勾选的输入材料会固定写入本版本，创建后将自动选中并可立即开始 AI 对话。`,
					submitLabel: `创建并选中${deliverableName}`,
					fields: [{
						name: "title",
						label: "交付件标题",
						type: "text",
						required: true,
						placeholder: "例如：订单部分退款需求"
					}]
				});
				if (values === void 0) return;
				const artifacts = this.state.snapshot?.artifacts ?? [];
				const sources = this.state.snapshot?.sources ?? [];
				const before = new Set(artifacts.map((item) => item.uid));
				await this.mutate({
					kind: "create-draft",
					workspaceId: this.state.workspaceId,
					stage: this.state.menu,
					title: String(values.title),
					basedOn: [...this.state.selected].filter((uid) => artifacts.some((item) => item.uid === uid)),
					sourceUids: [...this.state.selected].filter((uid) => sources.some((item) => item.uid === uid)),
					...this.state.workItemUid === void 0 ? {} : { workItemUid: this.state.workItemUid }
				});
				const created = this.state.snapshot?.artifacts.find((item) => !before.has(item.uid) && item.stage === this.state.menu && item.workItemUid === this.state.workItemUid && item.status === "draft");
				if (created !== void 0) {
					this.state.targetArtifactUid = created.uid;
					this.state.selected = /* @__PURE__ */ new Set([...created.basedOn.map((item) => item.uid), ...created.derivedFrom.map((item) => item.uid)]);
					this.render();
				}
			}
			async createRevision(artifactUid) {
				const snapshot = this.state.snapshot;
				const previous = snapshot?.artifacts.find((item) => item.uid === artifactUid);
				if (snapshot === void 0 || previous === void 0) return;
				this.state.loading = true;
				this.state.error = void 0;
				this.render();
				let response;
				try {
					response = await call({
						kind: "preview-revision",
						workspaceId: this.state.workspaceId,
						artifactUid
					});
				} catch (error) {
					this.state.error = error instanceof Error ? error.message : String(error);
					this.state.loading = false;
					return this.render();
				}
				this.state.loading = false;
				this.render();
				if (!response.ok) {
					this.state.error = response.error;
					return this.render();
				}
				if (!("revisionPreview" in response)) {
					this.state.error = "Host returned an unexpected revision preview";
					return this.render();
				}
				const preview = response.revisionPreview;
				const detail = preview.changes.length === 0 ? "当前来源、上游交付件和模板哈希均未变化。若是业务意图调整，请明确填写原因后创建修订" : `检测到 ${preview.changes.length} 项实际变化：${preview.changes.map((change) => `${change.label}（${change.previous?.version ?? change.previous?.contentHash?.slice(0, 16) ?? "无"} → ${change.current?.version ?? change.current?.contentHash?.slice(0, 16) ?? "无"}）`).join("；")}`;
				const values = await this.openForm({
					title: `创建变更修订 · ${preview.key} v${preview.nextVersion}`,
					description: `${detail}。旧会话保持只读，新修订将创建名称可区分的新会话并关联历史运行。`,
					submitLabel: "创建并选中变更修订",
					fields: [
						...preview.canCreateFromUpstream ? [{
							name: "revisionKind",
							label: "变更类型",
							type: "select",
							required: true,
							value: "upstream",
							options: [{
								value: "upstream",
								label: "处理检测到的上游变更"
							}, {
								value: "user-intent",
								label: "用户主动调整"
							}]
						}] : [],
						{
							name: "reason",
							label: "主动调整原因",
							type: "textarea",
							required: !preview.canCreateFromUpstream,
							placeholder: preview.canCreateFromUpstream ? "说明希望调整什么以及为什么调整；上游变更模式可以留空。" : "说明希望调整什么以及为什么调整。",
							showWhen: preview.canCreateFromUpstream ? {
								field: "revisionKind",
								value: "user-intent"
							} : void 0
						},
						{
							name: "affectedAreas",
							label: "预计影响范围（可选，每行一项）",
							type: "textarea",
							placeholder: "例如：退款业务规则\n验收条件 AC-03"
						}
					]
				});
				if (values === void 0) return;
				const revisionKind = preview.canCreateFromUpstream ? String(values.revisionKind) : "user-intent";
				const affectedAreas = String(values.affectedAreas ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
				const before = new Set(snapshot.artifacts.map((item) => item.uid));
				await this.mutate({
					kind: "create-revision",
					workspaceId: this.state.workspaceId,
					artifactUid,
					revisionKind,
					reason: String(values.reason ?? ""),
					affectedAreas
				});
				const created = this.state.snapshot?.artifacts.find((item) => !before.has(item.uid) && item.supersedes?.uid === artifactUid);
				if (created !== void 0) {
					this.state.targetArtifactUid = created.uid;
					this.state.selected = /* @__PURE__ */ new Set([...created.basedOn.map((item) => item.uid), ...created.derivedFrom.map((item) => item.uid)]);
					this.render();
				}
			}
			async importSource(forcedKind) {
				const snapshot = this.state.snapshot;
				const providers = snapshot?.sourceProviders ?? [];
				if (providers.length === 0) {
					this.state.error = "当前没有可用的业务数据获取方式";
					return this.render();
				}
				const defaultKind = forcedKind ?? "requirement";
				const kinds = [.../* @__PURE__ */ new Set([
					defaultKind,
					"requirement",
					"defect",
					...Object.keys(snapshot?.project?.sources ?? {})
				])];
				const kindLabels = {
					requirement: "需求",
					defect: "缺陷",
					issue: "问题"
				};
				const configured = snapshot?.project?.sources[defaultKind];
				const defaultProvider = configured !== void 0 && providers.includes(configured.provider) ? configured.provider : providers.includes("manual") ? "manual" : providers[0];
				const connectors = snapshot?.connectors ?? [];
				const manualKey = `MANUAL-${(/* @__PURE__ */ new Date()).toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)}`;
				const values = await this.openForm({
					title: "导入外部业务内容",
					description: "插件会读取外部系统中的原始事实并保存快照，AI 随后把它整合进当前阶段交付件。",
					submitLabel: "导入",
					fields: [
						...forcedKind === void 0 ? [{
							name: "kind",
							label: "导入内容",
							type: "select",
							required: true,
							value: defaultKind,
							options: kinds.map((value) => ({
								value,
								label: kindLabels[value] ?? value
							})),
							help: "用于区分需求、缺陷或企业自定义事项类型。"
						}] : [],
						{
							name: "provider",
							label: "获取方式",
							type: "select",
							required: true,
							value: defaultProvider,
							options: providers.map((value) => ({
								value,
								label: value === "manual" ? "手工录入（无需适配器）" : value === "command" ? "项目业务适配器（command）" : `已安装适配器：${value}`
							})),
							help: "手工录入开箱即用；企业适配器用于自动读取外部系统。两者都会生成相同的标准来源和工作单元。"
						},
						{
							name: "connector",
							label: "业务系统连接",
							type: "select",
							required: true,
							value: configured?.connector ?? connectors[0],
							options: connectors.length === 0 ? [{
								value: "",
								label: "尚未配置业务连接"
							}] : connectors.map((value) => ({
								value,
								label: value
							})),
							help: "来自 .sdd/business/connectors/，由项目业务开发人员维护。",
							showWhen: {
								field: "provider",
								value: "command"
							}
						},
						{
							name: "key",
							label: "主编号",
							type: "text",
							required: true,
							value: defaultProvider === "manual" ? manualKey : "",
							placeholder: defaultKind === "defect" ? "例如：BUG-1024" : "例如：PAY-381",
							help: "手工录入会预生成编号，也可以换成团队自己的编号。"
						},
						{
							name: "manualTitle",
							label: "标题",
							type: "text",
							required: true,
							placeholder: "例如：订单部分退款",
							help: "只需填写当前已知的最小信息，后续由需求讨论阶段的 AI 继续追问。",
							showWhen: {
								field: "provider",
								value: "manual"
							}
						},
						{
							name: "manualDescription",
							label: "初始描述",
							type: "textarea",
							placeholder: "例如：一笔订单需要支持分多次退款，具体次数和金额规则尚未确认。",
							showWhen: {
								field: "provider",
								value: "manual"
							}
						},
						{
							name: "manualItems",
							label: "子需求（可选）",
							type: "manual-items",
							help: "每个子需求分别填写编号、标题和不限行数的详细内容。留空时主需求本身形成一个工作单元。",
							showWhen: {
								field: "provider",
								value: "manual"
							}
						}
					]
				});
				if (values === void 0) return;
				const provider = String(values.provider);
				const connector = values.connector === void 0 ? void 0 : String(values.connector);
				if (provider === "command" && !connector) {
					this.state.error = "请先在 .sdd/business/connectors/ 配置业务系统连接";
					return this.render();
				}
				this.state.loading = true;
				this.state.error = void 0;
				this.render();
				try {
					const manualItems = JSON.parse(String(values.manualItems ?? "[]"));
					const input = provider === "manual" ? {
						title: String(values.manualTitle),
						description: String(values.manualDescription ?? ""),
						...manualItems.length === 0 ? {} : { items: manualItems }
					} : void 0;
					const response = await call({
						kind: "preview-source-import",
						workspaceId: this.state.workspaceId,
						provider,
						sourceKind: forcedKind ?? String(values.kind),
						key: String(values.key),
						...connector ? { connector } : {},
						...input === void 0 ? {} : { input }
					});
					if (!response.ok) throw new Error(response.error);
					if (!("preview" in response)) throw new Error("业务适配器未返回导入预览");
					this.state.loading = false;
					this.render();
					const preview = response.preview;
					const actionable = preview.items.filter((item) => item.change !== "unchanged");
					const counts = Object.fromEntries([
						"added",
						"modified",
						"removed",
						"unchanged"
					].map((kind) => [kind, preview.items.filter((item) => item.change === kind).length]));
					const changeLabels = {
						added: "新增",
						modified: "有变更",
						removed: "外部已移除"
					};
					const selected = await this.openForm({
						title: `同步预览 · ${preview.bundleKey}`,
						description: `${preview.bundleTitle}：新增 ${counts.added}，变更 ${counts.modified}，移除 ${counts.removed}，无变化 ${counts.unchanged}。只会应用勾选项。`,
						submitLabel: actionable.length === 0 ? "关闭" : "应用所选变更",
						fields: actionable.map((item, index) => ({
							name: `change-${index}`,
							label: `${changeLabels[item.change]} · ${item.externalKey} · ${item.title}`,
							type: "checkbox",
							value: true,
							help: item.changedPaths.length === 0 ? "创建独立需求工作单元" : `变化位置：${item.changedPaths.join("、")}`
						}))
					});
					if (selected === void 0 || actionable.length === 0) return;
					const identities = actionable.filter((_item, index) => selected[`change-${index}`] === true).map((item) => item.identity);
					if (identities.length === 0) return;
					this.state.loading = true;
					this.render();
					const applied = await call({
						kind: "apply-source-import",
						workspaceId: this.state.workspaceId,
						previewUid: preview.uid,
						identities
					});
					if (!applied.ok) throw new Error(applied.error);
					if (!("snapshot" in applied)) throw new Error("应用变更后未返回项目状态");
					this.state.snapshot = applied.snapshot;
					const first = applied.snapshot.workItems.find((item) => identities.includes(`${item.provider}:${item.kind}:${item.key}`));
					if (first !== void 0) {
						this.state.workItemUid = first.uid;
						this.state.selected = new Set([first.sourceUid, first.bundleSourceUid].filter((uid) => uid !== void 0));
						this.state.targetArtifactUid = void 0;
					}
				} catch (error) {
					this.state.error = error instanceof Error ? error.message : String(error);
				} finally {
					this.state.loading = false;
					this.render();
				}
			}
			selectedInputs() {
				const artifacts = this.state.snapshot?.artifacts ?? [];
				const sources = this.state.snapshot?.sources ?? [];
				return {
					artifacts: [...this.state.selected].filter((uid) => artifacts.some((item) => item.uid === uid)),
					sources: [...this.state.selected].filter((uid) => sources.some((item) => item.uid === uid))
				};
			}
			async startConversation() {
				if (this.state.menu === "dashboard" || this.state.targetArtifactUid === void 0) {
					this.state.error = "请先选择一个本阶段 draft 或 in-review 交付件";
					return this.render();
				}
				const existing = this.state.snapshot?.runs.find((item) => item.artifactUid === this.state.targetArtifactUid && item.status !== "completed");
				if (existing !== void 0) return this.resumeRun(existing.uid, false);
				this.state.loading = true;
				this.state.error = void 0;
				this.render();
				try {
					const sessionId = await this.workspaces.connectWorkspace(this.state.workspaceId);
					const inputs = this.selectedInputs();
					const response = await call({
						kind: "bind-session",
						workspaceId: this.state.workspaceId,
						stage: this.state.menu,
						artifactUid: this.state.targetArtifactUid,
						sessionId,
						artifactUids: inputs.artifacts,
						sourceUids: inputs.sources
					});
					if (!response.ok) throw new Error(response.error);
					if (!("prompt" in response)) throw new Error("Host returned an unexpected response");
					const binding = this.sessions.binding(sessionId);
					if (binding === void 0) throw new Error("新会话尚未在客户端就绪");
					if (response.run !== void 0) this.trackRun(binding.session, response.run, this.state.workspaceId);
					const accepted = await binding.session.prompt([{
						type: "text",
						text: response.prompt
					}], "queue");
					if (!accepted.ok) throw new Error(`${accepted.error.code}: ${accepted.error.message}`);
					const artifact = this.state.snapshot?.artifacts.find((item) => item.uid === this.state.targetArtifactUid);
					if (artifact) {
						const prefix = artifact.revision?.kind === "upstream" ? "[SDD变更·上游]" : artifact.revision?.kind === "user-intent" ? "[SDD变更·主动]" : "[SDD]";
						binding.session.rename(`${prefix} ${artifact.key} v${artifact.version} ${artifact.title}`);
					}
					this.sessions.open(sessionId);
					this.close();
				} catch (error) {
					this.state.error = error instanceof Error ? error.message : String(error);
				} finally {
					this.state.loading = false;
					this.render();
				}
			}
			async resumeRun(runUid, synchronize) {
				const run = this.state.snapshot?.runs.find((item) => item.uid === runUid);
				if (run?.sessionId === void 0) return;
				this.state.loading = true;
				this.state.error = void 0;
				this.render();
				try {
					const binding = this.sessions.binding(run.sessionId);
					if (binding === void 0) throw new Error("绑定会话不在当前 DSH 会话列表中");
					const response = await call({
						kind: "bind-session",
						workspaceId: this.state.workspaceId,
						runUid: run.uid,
						stage: run.stage,
						artifactUid: run.artifactUid,
						sessionId: run.sessionId,
						artifactUids: run.inputArtifactUids,
						sourceUids: run.sourceUids
					});
					if (!response.ok) throw new Error(response.error);
					if (!("prompt" in response)) throw new Error("Host returned an unexpected response");
					if (response.run !== void 0) this.trackRun(binding.session, response.run, this.state.workspaceId);
					const text = synchronize ? "同步当前对话中所有已确认结论到绑定交付件。重新读取交付件，补齐遗漏，保留未确认项；完成后报告修改内容。" : "恢复当前 SDD 阶段运行。重新读取绑定交付件和当前质量状态，概括已完成内容、待决问题，并继续与我协作。";
					const completion = synchronize ? this.waitForTurn(binding.session) : void 0;
					const accepted = await binding.session.prompt([{
						type: "text",
						text
					}], "queue");
					if (!accepted.ok) throw new Error(`${accepted.error.code}: ${accepted.error.message}`);
					this.sessions.open(run.sessionId);
					this.close();
					if (completion !== void 0) await completion;
				} catch (error) {
					this.state.error = error instanceof Error ? error.message : String(error);
					document.documentElement.setAttribute(ACTIVE_ATTR, "");
				} finally {
					this.state.loading = false;
					this.render();
				}
			}
			waitForTurn(session) {
				return new Promise((resolve, reject) => {
					let seen = session.getSnapshot().running;
					const timeout = window.setTimeout(() => {
						dispose();
						reject(/* @__PURE__ */ new Error("等待 AI 同步超时"));
					}, 600 * 1e3);
					const dispose = session.subscribe(() => {
						const running = session.getSnapshot().running;
						seen ||= running;
						if (seen && !running) {
							window.clearTimeout(timeout);
							dispose();
							resolve();
						}
					});
				});
			}
			trackRun(session, run, workspaceId) {
				const key = String(session.sessionId);
				this.trackedRuns.get(key)?.();
				let seenRunning = session.getSnapshot().running;
				const dispose = session.subscribe(() => {
					if (session.getSnapshot().running) seenRunning = true;
					else if (seenRunning) {
						seenRunning = false;
						call({
							kind: "sync-run",
							workspaceId,
							runUid: run.uid
						});
					}
				});
				this.trackedRuns.set(key, () => {
					dispose();
					this.trackedRuns.delete(key);
				});
			}
			async accept(artifactUid) {
				const snapshot = this.state.snapshot;
				const report = snapshot?.quality[artifactUid];
				const artifact = snapshot?.artifacts.find((item) => item.uid === artifactUid);
				if (report === void 0 || artifact === void 0) return;
				const checks = report.checks.filter((item) => item.code.startsWith("checklist:"));
				const values = await this.openForm({
					title: `验收 ${artifact.key}`,
					description: "请逐项确认本阶段的完成条件。验收后，该版本会成为下游阶段可选择的正式输入。",
					submitLabel: "确认验收",
					fields: checks.map((check) => {
						const index = check.code.split(":")[1];
						return {
							name: `item-${index}`,
							label: check.label.replace(/^验收：/, ""),
							type: "checkbox",
							required: true,
							value: artifact.checklist?.[`item-${index}`] === true,
							help: check.message
						};
					})
				});
				if (values === void 0) return;
				const checklist = Object.fromEntries(checks.map((check) => {
					const key = `item-${check.code.split(":")[1]}`;
					return [key, values[key] === true];
				}));
				await this.mutate({
					kind: "accept",
					workspaceId: this.state.workspaceId,
					artifactUid,
					checklist
				});
			}
			async createDevelopment() {
				if (!this.state.targetArtifactUid) return;
				const snapshot = this.state.snapshot;
				const workspace = snapshot?.developmentWorkspaces.find((item) => item.artifactUid === this.state.targetArtifactUid);
				const existing = new Set(workspace?.repositories.map((item) => item.id) ?? []);
				const repositories = (snapshot?.project?.development.repositories ?? []).filter((item) => !existing.has(item.id));
				if (repositories.length === 0) {
					this.state.error = existing.size > 0 ? "已添加全部已配置代码仓库" : "请先在 .sdd/project.yaml 中配置代码仓库";
					return this.render();
				}
				const values = await this.openForm({
					title: "添加代码仓库",
					description: "代码会下载到独立开发空间，并基于所选基线分支创建当前需求的工作分支。",
					submitLabel: "创建开发空间",
					fields: [{
						name: "repositoryId",
						label: "代码仓库",
						type: "select",
						required: true,
						value: repositories[0].id,
						options: repositories.map((item) => ({
							value: item.id,
							label: `${item.id} · 基线 ${item.baseBranch} · ${item.source}`
						}))
					}]
				});
				if (values === void 0) return;
				await this.mutate({
					kind: "development-create",
					workspaceId: this.state.workspaceId,
					artifactUid: this.state.targetArtifactUid,
					repositoryId: String(values.repositoryId)
				});
			}
			async runTest(repositoryId) {
				if (!this.state.targetArtifactUid) return;
				const repository = this.state.snapshot?.project?.development.repositories.find((item) => item.id === repositoryId);
				if (repository === void 0 || repository.testCommands.length === 0) {
					this.state.error = `仓库 ${repositoryId} 尚未配置测试项`;
					return this.render();
				}
				const values = await this.openForm({
					title: `运行测试 · ${repositoryId}`,
					description: "只允许执行项目配置中预先声明的测试项。",
					submitLabel: "开始测试",
					fields: [{
						name: "testId",
						label: "测试项",
						type: "select",
						required: true,
						value: repository.testCommands[0].id,
						options: repository.testCommands.map((item) => ({
							value: item.id,
							label: `${item.label} · ${item.argv.join(" ")}`
						}))
					}]
				});
				if (values === void 0) return;
				await this.mutate({
					kind: "development-test",
					workspaceId: this.state.workspaceId,
					artifactUid: this.state.targetArtifactUid,
					repositoryId,
					testId: String(values.testId)
				});
			}
			async commit(repositoryId) {
				if (!this.state.targetArtifactUid) return;
				const values = await this.openForm({
					title: `提交代码 · ${repositoryId}`,
					description: "将把该隔离开发空间中的全部变更暂存并创建本地 Git 提交；不会自动推送或合并。",
					submitLabel: "提交代码",
					fields: [{
						name: "message",
						label: "提交说明",
						type: "textarea",
						required: true,
						placeholder: "例如：feat: 完成订单部分退款流程"
					}]
				});
				if (values === void 0) return;
				await this.mutate({
					kind: "development-commit",
					workspaceId: this.state.workspaceId,
					artifactUid: this.state.targetArtifactUid,
					repositoryId,
					message: String(values.message)
				});
			}
			async resolveRemoval() {
				if (this.state.workItemUid === void 0) return;
				const values = await this.openForm({
					title: "处理外部需求移除",
					description: "历史来源、交付件和代码不会被删除。请选择这个工作单元后续在本项目中的状态。",
					submitLabel: "确认处理",
					fields: [{
						name: "decision",
						label: "处理方式",
						type: "select",
						required: true,
						value: "keep",
						options: [{
							value: "keep",
							label: "保留本地并继续推进"
						}, {
							value: "archive",
							label: "归档工作单元"
						}]
					}]
				});
				if (values === void 0) return;
				await this.mutate({
					kind: "resolve-work-item-removal",
					workspaceId: this.state.workspaceId,
					workItemUid: this.state.workItemUid,
					decision: String(values.decision)
				});
			}
		};
		function apply(ctx) {
			return new SddWorkbench(ctx.workspaces, ctx.sessions).start();
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map