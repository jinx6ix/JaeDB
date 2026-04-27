"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/itineraries/[id]/route";
exports.ids = ["app/api/itineraries/[id]/route"];
exports.modules = {

/***/ "@prisma/client":
/*!*********************************!*\
  !*** external "@prisma/client" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),

/***/ "bcryptjs":
/*!***************************!*\
  !*** external "bcryptjs" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("bcryptjs");

/***/ }),

/***/ "../../client/components/action-async-storage.external":
/*!*******************************************************************************!*\
  !*** external "next/dist/client/components/action-async-storage.external.js" ***!
  \*******************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/action-async-storage.external.js");

/***/ }),

/***/ "../../client/components/request-async-storage.external":
/*!********************************************************************************!*\
  !*** external "next/dist/client/components/request-async-storage.external.js" ***!
  \********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/request-async-storage.external.js");

/***/ }),

/***/ "../../client/components/static-generation-async-storage.external":
/*!******************************************************************************************!*\
  !*** external "next/dist/client/components/static-generation-async-storage.external.js" ***!
  \******************************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/static-generation-async-storage.external.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "assert":
/*!*************************!*\
  !*** external "assert" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("assert");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("buffer");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("events");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "querystring":
/*!******************************!*\
  !*** external "querystring" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("querystring");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");

/***/ }),

/***/ "(rsc)/./node_modules/.pnpm/next@14.2.20_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fitineraries%2F%5Bid%5D%2Froute&page=%2Fapi%2Fitineraries%2F%5Bid%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fitineraries%2F%5Bid%5D%2Froute.ts&appDir=C%3A%5CUsers%5CJinx%5CDesktop%5Ctestsharingpc1%5Cjae-travel-complete%5Cjae-travel-app%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CJinx%5CDesktop%5Ctestsharingpc1%5Cjae-travel-complete%5Cjae-travel-app&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/.pnpm/next@14.2.20_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fitineraries%2F%5Bid%5D%2Froute&page=%2Fapi%2Fitineraries%2F%5Bid%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fitineraries%2F%5Bid%5D%2Froute.ts&appDir=C%3A%5CUsers%5CJinx%5CDesktop%5Ctestsharingpc1%5Cjae-travel-complete%5Cjae-travel-app%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CJinx%5CDesktop%5Ctestsharingpc1%5Cjae-travel-complete%5Cjae-travel-app&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \****************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/.pnpm/next@14.2.20_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/.pnpm/next@14.2.20_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/.pnpm/next@14.2.20_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var C_Users_Jinx_Desktop_testsharingpc1_jae_travel_complete_jae_travel_app_app_api_itineraries_id_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/itineraries/[id]/route.ts */ \"(rsc)/./app/api/itineraries/[id]/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/itineraries/[id]/route\",\n        pathname: \"/api/itineraries/[id]\",\n        filename: \"route\",\n        bundlePath: \"app/api/itineraries/[id]/route\"\n    },\n    resolvedPagePath: \"C:\\\\Users\\\\Jinx\\\\Desktop\\\\testsharingpc1\\\\jae-travel-complete\\\\jae-travel-app\\\\app\\\\api\\\\itineraries\\\\[id]\\\\route.ts\",\n    nextConfigOutput,\n    userland: C_Users_Jinx_Desktop_testsharingpc1_jae_travel_complete_jae_travel_app_app_api_itineraries_id_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/api/itineraries/[id]/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvLnBucG0vbmV4dEAxNC4yLjIwX3JlYWN0LWRvbUAxOC4zLjFfcmVhY3RAMTguMy4xX19yZWFjdEAxOC4zLjEvbm9kZV9tb2R1bGVzL25leHQvZGlzdC9idWlsZC93ZWJwYWNrL2xvYWRlcnMvbmV4dC1hcHAtbG9hZGVyLmpzP25hbWU9YXBwJTJGYXBpJTJGaXRpbmVyYXJpZXMlMkYlNUJpZCU1RCUyRnJvdXRlJnBhZ2U9JTJGYXBpJTJGaXRpbmVyYXJpZXMlMkYlNUJpZCU1RCUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRml0aW5lcmFyaWVzJTJGJTVCaWQlNUQlMkZyb3V0ZS50cyZhcHBEaXI9QyUzQSU1Q1VzZXJzJTVDSmlueCU1Q0Rlc2t0b3AlNUN0ZXN0c2hhcmluZ3BjMSU1Q2phZS10cmF2ZWwtY29tcGxldGUlNUNqYWUtdHJhdmVsLWFwcCU1Q2FwcCZwYWdlRXh0ZW5zaW9ucz10c3gmcGFnZUV4dGVuc2lvbnM9dHMmcGFnZUV4dGVuc2lvbnM9anN4JnBhZ2VFeHRlbnNpb25zPWpzJnJvb3REaXI9QyUzQSU1Q1VzZXJzJTVDSmlueCU1Q0Rlc2t0b3AlNUN0ZXN0c2hhcmluZ3BjMSU1Q2phZS10cmF2ZWwtY29tcGxldGUlNUNqYWUtdHJhdmVsLWFwcCZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQXNHO0FBQ3ZDO0FBQ2M7QUFDb0U7QUFDako7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLGdIQUFtQjtBQUMzQztBQUNBLGNBQWMseUVBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxpRUFBaUU7QUFDekU7QUFDQTtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUN1SDs7QUFFdkgiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9qYWUtdHJhdmVsLWV4cGVkaXRpb25zLz9jM2VmIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcFJvdXRlUm91dGVNb2R1bGUgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9mdXR1cmUvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIkM6XFxcXFVzZXJzXFxcXEppbnhcXFxcRGVza3RvcFxcXFx0ZXN0c2hhcmluZ3BjMVxcXFxqYWUtdHJhdmVsLWNvbXBsZXRlXFxcXGphZS10cmF2ZWwtYXBwXFxcXGFwcFxcXFxhcGlcXFxcaXRpbmVyYXJpZXNcXFxcW2lkXVxcXFxyb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvaXRpbmVyYXJpZXMvW2lkXS9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL2l0aW5lcmFyaWVzL1tpZF1cIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvYXBpL2l0aW5lcmFyaWVzL1tpZF0vcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCJDOlxcXFxVc2Vyc1xcXFxKaW54XFxcXERlc2t0b3BcXFxcdGVzdHNoYXJpbmdwYzFcXFxcamFlLXRyYXZlbC1jb21wbGV0ZVxcXFxqYWUtdHJhdmVsLWFwcFxcXFxhcHBcXFxcYXBpXFxcXGl0aW5lcmFyaWVzXFxcXFtpZF1cXFxccm91dGUudHNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcyB9ID0gcm91dGVNb2R1bGU7XG5jb25zdCBvcmlnaW5hbFBhdGhuYW1lID0gXCIvYXBpL2l0aW5lcmFyaWVzL1tpZF0vcm91dGVcIjtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgc2VydmVySG9va3MsXG4gICAgICAgIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgb3JpZ2luYWxQYXRobmFtZSwgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/.pnpm/next@14.2.20_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fitineraries%2F%5Bid%5D%2Froute&page=%2Fapi%2Fitineraries%2F%5Bid%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fitineraries%2F%5Bid%5D%2Froute.ts&appDir=C%3A%5CUsers%5CJinx%5CDesktop%5Ctestsharingpc1%5Cjae-travel-complete%5Cjae-travel-app%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CJinx%5CDesktop%5Ctestsharingpc1%5Cjae-travel-complete%5Cjae-travel-app&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/api/itineraries/[id]/route.ts":
/*!*******************************************!*\
  !*** ./app/api/itineraries/[id]/route.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET),\n/* harmony export */   PATCH: () => (/* binding */ PATCH)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/.pnpm/next@14.2.20_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/api/server.js\");\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next-auth */ \"(rsc)/./node_modules/.pnpm/next-auth@4.24.14_next@14.2_48646de8c3b013ae1e76ffdd13804b9e/node_modules/next-auth/index.js\");\n/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(next_auth__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _lib_auth__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/lib/auth */ \"(rsc)/./lib/auth.ts\");\n/* harmony import */ var _lib_prisma__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/lib/prisma */ \"(rsc)/./lib/prisma.ts\");\n// app/api/itineraries/[id]/route.ts\n\n\n\n\nasync function GET(req, { params }) {\n    const session = await (0,next_auth__WEBPACK_IMPORTED_MODULE_1__.getServerSession)(_lib_auth__WEBPACK_IMPORTED_MODULE_2__.authOptions);\n    if (!session) return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n        error: \"Unauthorized\"\n    }, {\n        status: 401\n    });\n    const itinerary = await _lib_prisma__WEBPACK_IMPORTED_MODULE_3__.prisma.itinerary.findUnique({\n        where: {\n            id: params.id\n        },\n        include: {\n            booking: {\n                include: {\n                    client: true\n                }\n            },\n            days: {\n                orderBy: {\n                    dayNumber: \"asc\"\n                },\n                include: {\n                    images: {\n                        orderBy: {\n                            createdAt: \"asc\"\n                        }\n                    }\n                }\n            }\n        }\n    });\n    if (!itinerary) return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n        error: \"Not found\"\n    }, {\n        status: 404\n    });\n    return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json(itinerary);\n}\nasync function PATCH(req, { params }) {\n    const session = await (0,next_auth__WEBPACK_IMPORTED_MODULE_1__.getServerSession)(_lib_auth__WEBPACK_IMPORTED_MODULE_2__.authOptions);\n    if (!session) return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n        error: \"Unauthorized\"\n    }, {\n        status: 401\n    });\n    try {\n        const body = await req.json();\n        // Before deleting, collect existing image IDs per dayNumber so we can re-link them\n        const existingDays = await _lib_prisma__WEBPACK_IMPORTED_MODULE_3__.prisma.itineraryDay.findMany({\n            where: {\n                itineraryId: params.id\n            },\n            include: {\n                images: true\n            }\n        });\n        // Map dayNumber -> image IDs\n        const imagesByDayNumber = {};\n        for (const d of existingDays){\n            if (d.images.length > 0) {\n                imagesByDayNumber[d.dayNumber] = d.images.map((img)=>img.id);\n            }\n        }\n        // Detach images (set dayId null) before deleting days to avoid cascade-delete\n        const allImageIds = existingDays.flatMap((d)=>d.images.map((img)=>img.id));\n        if (allImageIds.length > 0) {\n            await _lib_prisma__WEBPACK_IMPORTED_MODULE_3__.prisma.itineraryImage.updateMany({\n                where: {\n                    id: {\n                        in: allImageIds\n                    }\n                },\n                data: {\n                    dayId: null\n                }\n            });\n        }\n        // Delete existing days and recreate\n        await _lib_prisma__WEBPACK_IMPORTED_MODULE_3__.prisma.itineraryDay.deleteMany({\n            where: {\n                itineraryId: params.id\n            }\n        });\n        const itinerary = await _lib_prisma__WEBPACK_IMPORTED_MODULE_3__.prisma.itinerary.update({\n            where: {\n                id: params.id\n            },\n            data: {\n                title: body.title,\n                days: {\n                    create: body.days.map((d)=>({\n                            dayNumber: d.dayNumber,\n                            date: d.date ? new Date(d.date) : null,\n                            destination: d.destination,\n                            accommodation: d.accommodation || null,\n                            mealPlan: d.mealPlan || null,\n                            activities: d.activities || null,\n                            notes: d.notes || null\n                        }))\n                }\n            },\n            include: {\n                days: {\n                    orderBy: {\n                        dayNumber: \"asc\"\n                    }\n                }\n            }\n        });\n        // Re-link images to new day IDs by matching dayNumber\n        const relinkPromises = [];\n        for (const savedDay of itinerary.days){\n            const imageIds = imagesByDayNumber[savedDay.dayNumber] || [];\n            if (imageIds.length > 0) {\n                relinkPromises.push(_lib_prisma__WEBPACK_IMPORTED_MODULE_3__.prisma.itineraryImage.updateMany({\n                    where: {\n                        id: {\n                            in: imageIds\n                        }\n                    },\n                    data: {\n                        dayId: savedDay.id\n                    }\n                }));\n            }\n        }\n        await Promise.all(relinkPromises);\n        // Return itinerary with images\n        const result = await _lib_prisma__WEBPACK_IMPORTED_MODULE_3__.prisma.itinerary.findUnique({\n            where: {\n                id: params.id\n            },\n            include: {\n                days: {\n                    orderBy: {\n                        dayNumber: \"asc\"\n                    },\n                    include: {\n                        images: {\n                            orderBy: {\n                                createdAt: \"asc\"\n                            }\n                        }\n                    }\n                }\n            }\n        });\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json(result);\n    } catch (e) {\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: e.message\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2l0aW5lcmFyaWVzL1tpZF0vcm91dGUudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBLG9DQUFvQztBQUNvQjtBQUNYO0FBQ0o7QUFDSDtBQUUvQixlQUFlSSxJQUFJQyxHQUFnQixFQUFFLEVBQUVDLE1BQU0sRUFBOEI7SUFDaEYsTUFBTUMsVUFBVSxNQUFNTiwyREFBZ0JBLENBQUNDLGtEQUFXQTtJQUNsRCxJQUFJLENBQUNLLFNBQVMsT0FBT1AscURBQVlBLENBQUNRLElBQUksQ0FBQztRQUFFQyxPQUFPO0lBQWUsR0FBRztRQUFFQyxRQUFRO0lBQUk7SUFFaEYsTUFBTUMsWUFBWSxNQUFNUiwrQ0FBTUEsQ0FBQ1EsU0FBUyxDQUFDQyxVQUFVLENBQUM7UUFDbERDLE9BQU87WUFBRUMsSUFBSVIsT0FBT1EsRUFBRTtRQUFDO1FBQ3ZCQyxTQUFTO1lBQ1BDLFNBQVM7Z0JBQUVELFNBQVM7b0JBQUVFLFFBQVE7Z0JBQUs7WUFBRTtZQUNyQ0MsTUFBTTtnQkFDSkMsU0FBUztvQkFBRUMsV0FBVztnQkFBTTtnQkFDNUJMLFNBQVM7b0JBQUVNLFFBQVE7d0JBQUVGLFNBQVM7NEJBQUVHLFdBQVc7d0JBQU07b0JBQUU7Z0JBQUU7WUFDdkQ7UUFDRjtJQUNGO0lBRUEsSUFBSSxDQUFDWCxXQUFXLE9BQU9YLHFEQUFZQSxDQUFDUSxJQUFJLENBQUM7UUFBRUMsT0FBTztJQUFZLEdBQUc7UUFBRUMsUUFBUTtJQUFJO0lBQy9FLE9BQU9WLHFEQUFZQSxDQUFDUSxJQUFJLENBQUNHO0FBQzNCO0FBRU8sZUFBZVksTUFBTWxCLEdBQWdCLEVBQUUsRUFBRUMsTUFBTSxFQUE4QjtJQUNsRixNQUFNQyxVQUFVLE1BQU1OLDJEQUFnQkEsQ0FBQ0Msa0RBQVdBO0lBQ2xELElBQUksQ0FBQ0ssU0FBUyxPQUFPUCxxREFBWUEsQ0FBQ1EsSUFBSSxDQUFDO1FBQUVDLE9BQU87SUFBZSxHQUFHO1FBQUVDLFFBQVE7SUFBSTtJQUVoRixJQUFJO1FBQ0YsTUFBTWMsT0FBTyxNQUFNbkIsSUFBSUcsSUFBSTtRQUUzQixtRkFBbUY7UUFDbkYsTUFBTWlCLGVBQWUsTUFBTXRCLCtDQUFNQSxDQUFDdUIsWUFBWSxDQUFDQyxRQUFRLENBQUM7WUFDdERkLE9BQU87Z0JBQUVlLGFBQWF0QixPQUFPUSxFQUFFO1lBQUM7WUFDaENDLFNBQVM7Z0JBQUVNLFFBQVE7WUFBSztRQUMxQjtRQUNBLDZCQUE2QjtRQUM3QixNQUFNUSxvQkFBOEMsQ0FBQztRQUNyRCxLQUFLLE1BQU1DLEtBQUtMLGFBQWM7WUFDNUIsSUFBSUssRUFBRVQsTUFBTSxDQUFDVSxNQUFNLEdBQUcsR0FBRztnQkFDdkJGLGlCQUFpQixDQUFDQyxFQUFFVixTQUFTLENBQUMsR0FBR1UsRUFBRVQsTUFBTSxDQUFDVyxHQUFHLENBQUNDLENBQUFBLE1BQU9BLElBQUluQixFQUFFO1lBQzdEO1FBQ0Y7UUFFQSw4RUFBOEU7UUFDOUUsTUFBTW9CLGNBQWNULGFBQWFVLE9BQU8sQ0FBQ0wsQ0FBQUEsSUFBS0EsRUFBRVQsTUFBTSxDQUFDVyxHQUFHLENBQUNDLENBQUFBLE1BQU9BLElBQUluQixFQUFFO1FBQ3hFLElBQUlvQixZQUFZSCxNQUFNLEdBQUcsR0FBRztZQUMxQixNQUFNNUIsK0NBQU1BLENBQUNpQyxjQUFjLENBQUNDLFVBQVUsQ0FBQztnQkFDckN4QixPQUFPO29CQUFFQyxJQUFJO3dCQUFFd0IsSUFBSUo7b0JBQVk7Z0JBQUU7Z0JBQ2pDSyxNQUFNO29CQUFFQyxPQUFPO2dCQUFLO1lBQ3RCO1FBQ0Y7UUFFQSxvQ0FBb0M7UUFDcEMsTUFBTXJDLCtDQUFNQSxDQUFDdUIsWUFBWSxDQUFDZSxVQUFVLENBQUM7WUFBRTVCLE9BQU87Z0JBQUVlLGFBQWF0QixPQUFPUSxFQUFFO1lBQUM7UUFBRTtRQUV6RSxNQUFNSCxZQUFZLE1BQU1SLCtDQUFNQSxDQUFDUSxTQUFTLENBQUMrQixNQUFNLENBQUM7WUFDOUM3QixPQUFPO2dCQUFFQyxJQUFJUixPQUFPUSxFQUFFO1lBQUM7WUFDdkJ5QixNQUFNO2dCQUNKSSxPQUFPbkIsS0FBS21CLEtBQUs7Z0JBQ2pCekIsTUFBTTtvQkFDSjBCLFFBQVFwQixLQUFLTixJQUFJLENBQUNjLEdBQUcsQ0FBQyxDQUFDRixJQUFZOzRCQUNqQ1YsV0FBV1UsRUFBRVYsU0FBUzs0QkFDdEJ5QixNQUFNZixFQUFFZSxJQUFJLEdBQUcsSUFBSUMsS0FBS2hCLEVBQUVlLElBQUksSUFBSTs0QkFDbENFLGFBQWFqQixFQUFFaUIsV0FBVzs0QkFDMUJDLGVBQWVsQixFQUFFa0IsYUFBYSxJQUFJOzRCQUNsQ0MsVUFBVW5CLEVBQUVtQixRQUFRLElBQUk7NEJBQ3hCQyxZQUFZcEIsRUFBRW9CLFVBQVUsSUFBSTs0QkFDNUJDLE9BQU9yQixFQUFFcUIsS0FBSyxJQUFJO3dCQUNwQjtnQkFDRjtZQUNGO1lBQ0FwQyxTQUFTO2dCQUNQRyxNQUFNO29CQUFFQyxTQUFTO3dCQUFFQyxXQUFXO29CQUFNO2dCQUFFO1lBQ3hDO1FBQ0Y7UUFFQSxzREFBc0Q7UUFDdEQsTUFBTWdDLGlCQUFpQyxFQUFFO1FBQ3pDLEtBQUssTUFBTUMsWUFBWTFDLFVBQVVPLElBQUksQ0FBRTtZQUNyQyxNQUFNb0MsV0FBV3pCLGlCQUFpQixDQUFDd0IsU0FBU2pDLFNBQVMsQ0FBQyxJQUFJLEVBQUU7WUFDNUQsSUFBSWtDLFNBQVN2QixNQUFNLEdBQUcsR0FBRztnQkFDdkJxQixlQUFlRyxJQUFJLENBQ2pCcEQsK0NBQU1BLENBQUNpQyxjQUFjLENBQUNDLFVBQVUsQ0FBQztvQkFDL0J4QixPQUFPO3dCQUFFQyxJQUFJOzRCQUFFd0IsSUFBSWdCO3dCQUFTO29CQUFFO29CQUM5QmYsTUFBTTt3QkFBRUMsT0FBT2EsU0FBU3ZDLEVBQUU7b0JBQUM7Z0JBQzdCO1lBRUo7UUFDRjtRQUNBLE1BQU0wQyxRQUFRQyxHQUFHLENBQUNMO1FBRWxCLCtCQUErQjtRQUMvQixNQUFNTSxTQUFTLE1BQU12RCwrQ0FBTUEsQ0FBQ1EsU0FBUyxDQUFDQyxVQUFVLENBQUM7WUFDL0NDLE9BQU87Z0JBQUVDLElBQUlSLE9BQU9RLEVBQUU7WUFBQztZQUN2QkMsU0FBUztnQkFDUEcsTUFBTTtvQkFDSkMsU0FBUzt3QkFBRUMsV0FBVztvQkFBTTtvQkFDNUJMLFNBQVM7d0JBQUVNLFFBQVE7NEJBQUVGLFNBQVM7Z0NBQUVHLFdBQVc7NEJBQU07d0JBQUU7b0JBQUU7Z0JBQ3ZEO1lBQ0Y7UUFDRjtRQUVBLE9BQU90QixxREFBWUEsQ0FBQ1EsSUFBSSxDQUFDa0Q7SUFDM0IsRUFBRSxPQUFPQyxHQUFRO1FBQ2YsT0FBTzNELHFEQUFZQSxDQUFDUSxJQUFJLENBQUM7WUFBRUMsT0FBT2tELEVBQUVDLE9BQU87UUFBQyxHQUFHO1lBQUVsRCxRQUFRO1FBQUk7SUFDL0Q7QUFDRiIsInNvdXJjZXMiOlsid2VicGFjazovL2phZS10cmF2ZWwtZXhwZWRpdGlvbnMvLi9hcHAvYXBpL2l0aW5lcmFyaWVzL1tpZF0vcm91dGUudHM/OGJiNyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBhcHAvYXBpL2l0aW5lcmFyaWVzL1tpZF0vcm91dGUudHNcbmltcG9ydCB7IE5leHRSZXF1ZXN0LCBOZXh0UmVzcG9uc2UgfSBmcm9tICduZXh0L3NlcnZlcic7XG5pbXBvcnQgeyBnZXRTZXJ2ZXJTZXNzaW9uIH0gZnJvbSAnbmV4dC1hdXRoJztcbmltcG9ydCB7IGF1dGhPcHRpb25zIH0gZnJvbSAnQC9saWIvYXV0aCc7XG5pbXBvcnQgeyBwcmlzbWEgfSBmcm9tICdAL2xpYi9wcmlzbWEnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gR0VUKHJlcTogTmV4dFJlcXVlc3QsIHsgcGFyYW1zIH06IHsgcGFyYW1zOiB7IGlkOiBzdHJpbmcgfSB9KSB7XG4gIGNvbnN0IHNlc3Npb24gPSBhd2FpdCBnZXRTZXJ2ZXJTZXNzaW9uKGF1dGhPcHRpb25zKTtcbiAgaWYgKCFzZXNzaW9uKSByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogJ1VuYXV0aG9yaXplZCcgfSwgeyBzdGF0dXM6IDQwMSB9KTtcblxuICBjb25zdCBpdGluZXJhcnkgPSBhd2FpdCBwcmlzbWEuaXRpbmVyYXJ5LmZpbmRVbmlxdWUoe1xuICAgIHdoZXJlOiB7IGlkOiBwYXJhbXMuaWQgfSxcbiAgICBpbmNsdWRlOiB7XG4gICAgICBib29raW5nOiB7IGluY2x1ZGU6IHsgY2xpZW50OiB0cnVlIH0gfSxcbiAgICAgIGRheXM6IHtcbiAgICAgICAgb3JkZXJCeTogeyBkYXlOdW1iZXI6ICdhc2MnIH0sXG4gICAgICAgIGluY2x1ZGU6IHsgaW1hZ2VzOiB7IG9yZGVyQnk6IHsgY3JlYXRlZEF0OiAnYXNjJyB9IH0gfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSk7XG5cbiAgaWYgKCFpdGluZXJhcnkpIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiAnTm90IGZvdW5kJyB9LCB7IHN0YXR1czogNDA0IH0pO1xuICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oaXRpbmVyYXJ5KTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIFBBVENIKHJlcTogTmV4dFJlcXVlc3QsIHsgcGFyYW1zIH06IHsgcGFyYW1zOiB7IGlkOiBzdHJpbmcgfSB9KSB7XG4gIGNvbnN0IHNlc3Npb24gPSBhd2FpdCBnZXRTZXJ2ZXJTZXNzaW9uKGF1dGhPcHRpb25zKTtcbiAgaWYgKCFzZXNzaW9uKSByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogJ1VuYXV0aG9yaXplZCcgfSwgeyBzdGF0dXM6IDQwMSB9KTtcblxuICB0cnkge1xuICAgIGNvbnN0IGJvZHkgPSBhd2FpdCByZXEuanNvbigpO1xuXG4gICAgLy8gQmVmb3JlIGRlbGV0aW5nLCBjb2xsZWN0IGV4aXN0aW5nIGltYWdlIElEcyBwZXIgZGF5TnVtYmVyIHNvIHdlIGNhbiByZS1saW5rIHRoZW1cbiAgICBjb25zdCBleGlzdGluZ0RheXMgPSBhd2FpdCBwcmlzbWEuaXRpbmVyYXJ5RGF5LmZpbmRNYW55KHtcbiAgICAgIHdoZXJlOiB7IGl0aW5lcmFyeUlkOiBwYXJhbXMuaWQgfSxcbiAgICAgIGluY2x1ZGU6IHsgaW1hZ2VzOiB0cnVlIH0sXG4gICAgfSk7XG4gICAgLy8gTWFwIGRheU51bWJlciAtPiBpbWFnZSBJRHNcbiAgICBjb25zdCBpbWFnZXNCeURheU51bWJlcjogUmVjb3JkPG51bWJlciwgc3RyaW5nW10+ID0ge307XG4gICAgZm9yIChjb25zdCBkIG9mIGV4aXN0aW5nRGF5cykge1xuICAgICAgaWYgKGQuaW1hZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgaW1hZ2VzQnlEYXlOdW1iZXJbZC5kYXlOdW1iZXJdID0gZC5pbWFnZXMubWFwKGltZyA9PiBpbWcuaWQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIERldGFjaCBpbWFnZXMgKHNldCBkYXlJZCBudWxsKSBiZWZvcmUgZGVsZXRpbmcgZGF5cyB0byBhdm9pZCBjYXNjYWRlLWRlbGV0ZVxuICAgIGNvbnN0IGFsbEltYWdlSWRzID0gZXhpc3RpbmdEYXlzLmZsYXRNYXAoZCA9PiBkLmltYWdlcy5tYXAoaW1nID0+IGltZy5pZCkpO1xuICAgIGlmIChhbGxJbWFnZUlkcy5sZW5ndGggPiAwKSB7XG4gICAgICBhd2FpdCBwcmlzbWEuaXRpbmVyYXJ5SW1hZ2UudXBkYXRlTWFueSh7XG4gICAgICAgIHdoZXJlOiB7IGlkOiB7IGluOiBhbGxJbWFnZUlkcyB9IH0sXG4gICAgICAgIGRhdGE6IHsgZGF5SWQ6IG51bGwgfSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIERlbGV0ZSBleGlzdGluZyBkYXlzIGFuZCByZWNyZWF0ZVxuICAgIGF3YWl0IHByaXNtYS5pdGluZXJhcnlEYXkuZGVsZXRlTWFueSh7IHdoZXJlOiB7IGl0aW5lcmFyeUlkOiBwYXJhbXMuaWQgfSB9KTtcblxuICAgIGNvbnN0IGl0aW5lcmFyeSA9IGF3YWl0IHByaXNtYS5pdGluZXJhcnkudXBkYXRlKHtcbiAgICAgIHdoZXJlOiB7IGlkOiBwYXJhbXMuaWQgfSxcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgdGl0bGU6IGJvZHkudGl0bGUsXG4gICAgICAgIGRheXM6IHtcbiAgICAgICAgICBjcmVhdGU6IGJvZHkuZGF5cy5tYXAoKGQ6IGFueSkgPT4gKHtcbiAgICAgICAgICAgIGRheU51bWJlcjogZC5kYXlOdW1iZXIsXG4gICAgICAgICAgICBkYXRlOiBkLmRhdGUgPyBuZXcgRGF0ZShkLmRhdGUpIDogbnVsbCxcbiAgICAgICAgICAgIGRlc3RpbmF0aW9uOiBkLmRlc3RpbmF0aW9uLFxuICAgICAgICAgICAgYWNjb21tb2RhdGlvbjogZC5hY2NvbW1vZGF0aW9uIHx8IG51bGwsXG4gICAgICAgICAgICBtZWFsUGxhbjogZC5tZWFsUGxhbiB8fCBudWxsLFxuICAgICAgICAgICAgYWN0aXZpdGllczogZC5hY3Rpdml0aWVzIHx8IG51bGwsXG4gICAgICAgICAgICBub3RlczogZC5ub3RlcyB8fCBudWxsLFxuICAgICAgICAgIH0pKSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBpbmNsdWRlOiB7XG4gICAgICAgIGRheXM6IHsgb3JkZXJCeTogeyBkYXlOdW1iZXI6ICdhc2MnIH0gfSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBSZS1saW5rIGltYWdlcyB0byBuZXcgZGF5IElEcyBieSBtYXRjaGluZyBkYXlOdW1iZXJcbiAgICBjb25zdCByZWxpbmtQcm9taXNlczogUHJvbWlzZTxhbnk+W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNhdmVkRGF5IG9mIGl0aW5lcmFyeS5kYXlzKSB7XG4gICAgICBjb25zdCBpbWFnZUlkcyA9IGltYWdlc0J5RGF5TnVtYmVyW3NhdmVkRGF5LmRheU51bWJlcl0gfHwgW107XG4gICAgICBpZiAoaW1hZ2VJZHMubGVuZ3RoID4gMCkge1xuICAgICAgICByZWxpbmtQcm9taXNlcy5wdXNoKFxuICAgICAgICAgIHByaXNtYS5pdGluZXJhcnlJbWFnZS51cGRhdGVNYW55KHtcbiAgICAgICAgICAgIHdoZXJlOiB7IGlkOiB7IGluOiBpbWFnZUlkcyB9IH0sXG4gICAgICAgICAgICBkYXRhOiB7IGRheUlkOiBzYXZlZERheS5pZCB9LFxuICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICAgIGF3YWl0IFByb21pc2UuYWxsKHJlbGlua1Byb21pc2VzKTtcblxuICAgIC8vIFJldHVybiBpdGluZXJhcnkgd2l0aCBpbWFnZXNcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwcmlzbWEuaXRpbmVyYXJ5LmZpbmRVbmlxdWUoe1xuICAgICAgd2hlcmU6IHsgaWQ6IHBhcmFtcy5pZCB9LFxuICAgICAgaW5jbHVkZToge1xuICAgICAgICBkYXlzOiB7XG4gICAgICAgICAgb3JkZXJCeTogeyBkYXlOdW1iZXI6ICdhc2MnIH0sXG4gICAgICAgICAgaW5jbHVkZTogeyBpbWFnZXM6IHsgb3JkZXJCeTogeyBjcmVhdGVkQXQ6ICdhc2MnIH0gfSB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihyZXN1bHQpO1xuICB9IGNhdGNoIChlOiBhbnkpIHtcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogZS5tZXNzYWdlIH0sIHsgc3RhdHVzOiA1MDAgfSk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJOZXh0UmVzcG9uc2UiLCJnZXRTZXJ2ZXJTZXNzaW9uIiwiYXV0aE9wdGlvbnMiLCJwcmlzbWEiLCJHRVQiLCJyZXEiLCJwYXJhbXMiLCJzZXNzaW9uIiwianNvbiIsImVycm9yIiwic3RhdHVzIiwiaXRpbmVyYXJ5IiwiZmluZFVuaXF1ZSIsIndoZXJlIiwiaWQiLCJpbmNsdWRlIiwiYm9va2luZyIsImNsaWVudCIsImRheXMiLCJvcmRlckJ5IiwiZGF5TnVtYmVyIiwiaW1hZ2VzIiwiY3JlYXRlZEF0IiwiUEFUQ0giLCJib2R5IiwiZXhpc3RpbmdEYXlzIiwiaXRpbmVyYXJ5RGF5IiwiZmluZE1hbnkiLCJpdGluZXJhcnlJZCIsImltYWdlc0J5RGF5TnVtYmVyIiwiZCIsImxlbmd0aCIsIm1hcCIsImltZyIsImFsbEltYWdlSWRzIiwiZmxhdE1hcCIsIml0aW5lcmFyeUltYWdlIiwidXBkYXRlTWFueSIsImluIiwiZGF0YSIsImRheUlkIiwiZGVsZXRlTWFueSIsInVwZGF0ZSIsInRpdGxlIiwiY3JlYXRlIiwiZGF0ZSIsIkRhdGUiLCJkZXN0aW5hdGlvbiIsImFjY29tbW9kYXRpb24iLCJtZWFsUGxhbiIsImFjdGl2aXRpZXMiLCJub3RlcyIsInJlbGlua1Byb21pc2VzIiwic2F2ZWREYXkiLCJpbWFnZUlkcyIsInB1c2giLCJQcm9taXNlIiwiYWxsIiwicmVzdWx0IiwiZSIsIm1lc3NhZ2UiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./app/api/itineraries/[id]/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/auth.ts":
/*!*********************!*\
  !*** ./lib/auth.ts ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   authOptions: () => (/* binding */ authOptions)\n/* harmony export */ });\n/* harmony import */ var next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next-auth/providers/credentials */ \"(rsc)/./node_modules/.pnpm/next-auth@4.24.14_next@14.2_48646de8c3b013ae1e76ffdd13804b9e/node_modules/next-auth/providers/credentials.js\");\n/* harmony import */ var bcryptjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! bcryptjs */ \"bcryptjs\");\n/* harmony import */ var bcryptjs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(bcryptjs__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _lib_prisma__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/lib/prisma */ \"(rsc)/./lib/prisma.ts\");\n// lib/auth.ts\n\n\n\nconst authOptions = {\n    session: {\n        strategy: \"jwt\"\n    },\n    pages: {\n        signIn: \"/login\"\n    },\n    providers: [\n        (0,next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_0__[\"default\"])({\n            name: \"credentials\",\n            credentials: {\n                email: {\n                    label: \"Email\",\n                    type: \"email\"\n                },\n                password: {\n                    label: \"Password\",\n                    type: \"password\"\n                }\n            },\n            async authorize (credentials) {\n                if (!credentials?.email || !credentials?.password) return null;\n                const user = await _lib_prisma__WEBPACK_IMPORTED_MODULE_2__.prisma.user.findUnique({\n                    where: {\n                        email: credentials.email\n                    }\n                });\n                if (!user || !user.isActive) return null;\n                const isValid = await bcryptjs__WEBPACK_IMPORTED_MODULE_1___default().compare(credentials.password, user.password);\n                if (!isValid) return null;\n                return {\n                    id: user.id,\n                    name: user.name,\n                    email: user.email,\n                    role: user.role\n                };\n            }\n        })\n    ],\n    callbacks: {\n        async jwt ({ token, user }) {\n            if (user) {\n                token.id = user.id;\n                token.role = user.role;\n            }\n            return token;\n        },\n        async session ({ session, token }) {\n            if (session.user) {\n                session.user.id = token.id;\n                session.user.role = token.role;\n            }\n            return session;\n        }\n    }\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvYXV0aC50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBLGNBQWM7QUFFb0Q7QUFDcEM7QUFDUTtBQUUvQixNQUFNRyxjQUErQjtJQUMxQ0MsU0FBUztRQUFFQyxVQUFVO0lBQU07SUFDM0JDLE9BQU87UUFBRUMsUUFBUTtJQUFTO0lBQzFCQyxXQUFXO1FBQ1RSLDJFQUFtQkEsQ0FBQztZQUNsQlMsTUFBTTtZQUNOQyxhQUFhO2dCQUNYQyxPQUFPO29CQUFFQyxPQUFPO29CQUFTQyxNQUFNO2dCQUFRO2dCQUN2Q0MsVUFBVTtvQkFBRUYsT0FBTztvQkFBWUMsTUFBTTtnQkFBVztZQUNsRDtZQUNBLE1BQU1FLFdBQVVMLFdBQVc7Z0JBQ3pCLElBQUksQ0FBQ0EsYUFBYUMsU0FBUyxDQUFDRCxhQUFhSSxVQUFVLE9BQU87Z0JBQzFELE1BQU1FLE9BQU8sTUFBTWQsK0NBQU1BLENBQUNjLElBQUksQ0FBQ0MsVUFBVSxDQUFDO29CQUN4Q0MsT0FBTzt3QkFBRVAsT0FBT0QsWUFBWUMsS0FBSztvQkFBQztnQkFDcEM7Z0JBQ0EsSUFBSSxDQUFDSyxRQUFRLENBQUNBLEtBQUtHLFFBQVEsRUFBRSxPQUFPO2dCQUNwQyxNQUFNQyxVQUFVLE1BQU1uQix1REFBYyxDQUFDUyxZQUFZSSxRQUFRLEVBQUVFLEtBQUtGLFFBQVE7Z0JBQ3hFLElBQUksQ0FBQ00sU0FBUyxPQUFPO2dCQUNyQixPQUFPO29CQUFFRSxJQUFJTixLQUFLTSxFQUFFO29CQUFFYixNQUFNTyxLQUFLUCxJQUFJO29CQUFFRSxPQUFPSyxLQUFLTCxLQUFLO29CQUFFWSxNQUFNUCxLQUFLTyxJQUFJO2dCQUFDO1lBQzVFO1FBQ0Y7S0FDRDtJQUNEQyxXQUFXO1FBQ1QsTUFBTUMsS0FBSSxFQUFFQyxLQUFLLEVBQUVWLElBQUksRUFBRTtZQUN2QixJQUFJQSxNQUFNO2dCQUNSVSxNQUFNSixFQUFFLEdBQUdOLEtBQUtNLEVBQUU7Z0JBQ2xCSSxNQUFNSCxJQUFJLEdBQUcsS0FBY0EsSUFBSTtZQUNqQztZQUNBLE9BQU9HO1FBQ1Q7UUFDQSxNQUFNdEIsU0FBUSxFQUFFQSxPQUFPLEVBQUVzQixLQUFLLEVBQUU7WUFDOUIsSUFBSXRCLFFBQVFZLElBQUksRUFBRTtnQkFDZlosUUFBUVksSUFBSSxDQUFTTSxFQUFFLEdBQUdJLE1BQU1KLEVBQUU7Z0JBQ2xDbEIsUUFBUVksSUFBSSxDQUFTTyxJQUFJLEdBQUdHLE1BQU1ILElBQUk7WUFDekM7WUFDQSxPQUFPbkI7UUFDVDtJQUNGO0FBQ0YsRUFBRSIsInNvdXJjZXMiOlsid2VicGFjazovL2phZS10cmF2ZWwtZXhwZWRpdGlvbnMvLi9saWIvYXV0aC50cz9iZjdlIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIGxpYi9hdXRoLnRzXG5pbXBvcnQgeyBOZXh0QXV0aE9wdGlvbnMgfSBmcm9tICduZXh0LWF1dGgnO1xuaW1wb3J0IENyZWRlbnRpYWxzUHJvdmlkZXIgZnJvbSAnbmV4dC1hdXRoL3Byb3ZpZGVycy9jcmVkZW50aWFscyc7XG5pbXBvcnQgYmNyeXB0IGZyb20gJ2JjcnlwdGpzJztcbmltcG9ydCB7IHByaXNtYSB9IGZyb20gJ0AvbGliL3ByaXNtYSc7XG5cbmV4cG9ydCBjb25zdCBhdXRoT3B0aW9uczogTmV4dEF1dGhPcHRpb25zID0ge1xuICBzZXNzaW9uOiB7IHN0cmF0ZWd5OiAnand0JyB9LFxuICBwYWdlczogeyBzaWduSW46ICcvbG9naW4nIH0sXG4gIHByb3ZpZGVyczogW1xuICAgIENyZWRlbnRpYWxzUHJvdmlkZXIoe1xuICAgICAgbmFtZTogJ2NyZWRlbnRpYWxzJyxcbiAgICAgIGNyZWRlbnRpYWxzOiB7XG4gICAgICAgIGVtYWlsOiB7IGxhYmVsOiAnRW1haWwnLCB0eXBlOiAnZW1haWwnIH0sXG4gICAgICAgIHBhc3N3b3JkOiB7IGxhYmVsOiAnUGFzc3dvcmQnLCB0eXBlOiAncGFzc3dvcmQnIH0sXG4gICAgICB9LFxuICAgICAgYXN5bmMgYXV0aG9yaXplKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgIGlmICghY3JlZGVudGlhbHM/LmVtYWlsIHx8ICFjcmVkZW50aWFscz8ucGFzc3dvcmQpIHJldHVybiBudWxsO1xuICAgICAgICBjb25zdCB1c2VyID0gYXdhaXQgcHJpc21hLnVzZXIuZmluZFVuaXF1ZSh7XG4gICAgICAgICAgd2hlcmU6IHsgZW1haWw6IGNyZWRlbnRpYWxzLmVtYWlsIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXVzZXIgfHwgIXVzZXIuaXNBY3RpdmUpIHJldHVybiBudWxsO1xuICAgICAgICBjb25zdCBpc1ZhbGlkID0gYXdhaXQgYmNyeXB0LmNvbXBhcmUoY3JlZGVudGlhbHMucGFzc3dvcmQsIHVzZXIucGFzc3dvcmQpO1xuICAgICAgICBpZiAoIWlzVmFsaWQpIHJldHVybiBudWxsO1xuICAgICAgICByZXR1cm4geyBpZDogdXNlci5pZCwgbmFtZTogdXNlci5uYW1lLCBlbWFpbDogdXNlci5lbWFpbCwgcm9sZTogdXNlci5yb2xlIH07XG4gICAgICB9LFxuICAgIH0pLFxuICBdLFxuICBjYWxsYmFja3M6IHtcbiAgICBhc3luYyBqd3QoeyB0b2tlbiwgdXNlciB9KSB7XG4gICAgICBpZiAodXNlcikge1xuICAgICAgICB0b2tlbi5pZCA9IHVzZXIuaWQ7XG4gICAgICAgIHRva2VuLnJvbGUgPSAodXNlciBhcyBhbnkpLnJvbGU7XG4gICAgICB9XG4gICAgICByZXR1cm4gdG9rZW47XG4gICAgfSxcbiAgICBhc3luYyBzZXNzaW9uKHsgc2Vzc2lvbiwgdG9rZW4gfSkge1xuICAgICAgaWYgKHNlc3Npb24udXNlcikge1xuICAgICAgICAoc2Vzc2lvbi51c2VyIGFzIGFueSkuaWQgPSB0b2tlbi5pZDtcbiAgICAgICAgKHNlc3Npb24udXNlciBhcyBhbnkpLnJvbGUgPSB0b2tlbi5yb2xlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHNlc3Npb247XG4gICAgfSxcbiAgfSxcbn07XG4iXSwibmFtZXMiOlsiQ3JlZGVudGlhbHNQcm92aWRlciIsImJjcnlwdCIsInByaXNtYSIsImF1dGhPcHRpb25zIiwic2Vzc2lvbiIsInN0cmF0ZWd5IiwicGFnZXMiLCJzaWduSW4iLCJwcm92aWRlcnMiLCJuYW1lIiwiY3JlZGVudGlhbHMiLCJlbWFpbCIsImxhYmVsIiwidHlwZSIsInBhc3N3b3JkIiwiYXV0aG9yaXplIiwidXNlciIsImZpbmRVbmlxdWUiLCJ3aGVyZSIsImlzQWN0aXZlIiwiaXNWYWxpZCIsImNvbXBhcmUiLCJpZCIsInJvbGUiLCJjYWxsYmFja3MiLCJqd3QiLCJ0b2tlbiJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/auth.ts\n");

/***/ }),

/***/ "(rsc)/./lib/prisma.ts":
/*!***********************!*\
  !*** ./lib/prisma.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   prisma: () => (/* binding */ prisma)\n/* harmony export */ });\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @prisma/client */ \"@prisma/client\");\n/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_prisma_client__WEBPACK_IMPORTED_MODULE_0__);\n// lib/prisma.ts\n\nconst globalForPrisma = globalThis;\nconst prisma = globalForPrisma.prisma ?? new _prisma_client__WEBPACK_IMPORTED_MODULE_0__.PrismaClient({\n    log: [\n        \"error\"\n    ]\n});\nif (true) globalForPrisma.prisma = prisma;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvcHJpc21hLnRzIiwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLGdCQUFnQjtBQUM4QjtBQUU5QyxNQUFNQyxrQkFBa0JDO0FBSWpCLE1BQU1DLFNBQ1hGLGdCQUFnQkUsTUFBTSxJQUN0QixJQUFJSCx3REFBWUEsQ0FBQztJQUFFSSxLQUFLO1FBQUM7S0FBUTtBQUFDLEdBQUc7QUFFdkMsSUFBSUMsSUFBeUIsRUFBY0osZ0JBQWdCRSxNQUFNLEdBQUdBIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vamFlLXRyYXZlbC1leHBlZGl0aW9ucy8uL2xpYi9wcmlzbWEudHM/OTgyMiJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBsaWIvcHJpc21hLnRzXG5pbXBvcnQgeyBQcmlzbWFDbGllbnQgfSBmcm9tICdAcHJpc21hL2NsaWVudCc7XG5cbmNvbnN0IGdsb2JhbEZvclByaXNtYSA9IGdsb2JhbFRoaXMgYXMgdW5rbm93biBhcyB7XG4gIHByaXNtYTogUHJpc21hQ2xpZW50IHwgdW5kZWZpbmVkO1xufTtcblxuZXhwb3J0IGNvbnN0IHByaXNtYSA9XG4gIGdsb2JhbEZvclByaXNtYS5wcmlzbWEgPz9cbiAgbmV3IFByaXNtYUNsaWVudCh7IGxvZzogWydlcnJvciddIH0pO1xuXG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykgZ2xvYmFsRm9yUHJpc21hLnByaXNtYSA9IHByaXNtYTtcbiJdLCJuYW1lcyI6WyJQcmlzbWFDbGllbnQiLCJnbG9iYWxGb3JQcmlzbWEiLCJnbG9iYWxUaGlzIiwicHJpc21hIiwibG9nIiwicHJvY2VzcyJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/prisma.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next@14.2.20_react-dom@18.3.1_react@18.3.1__react@18.3.1","vendor-chunks/next-auth@4.24.14_next@14.2_48646de8c3b013ae1e76ffdd13804b9e","vendor-chunks/@babel+runtime@7.29.2","vendor-chunks/jose@4.15.9","vendor-chunks/openid-client@5.7.1","vendor-chunks/oauth@0.9.15","vendor-chunks/object-hash@2.2.0","vendor-chunks/preact@10.29.1","vendor-chunks/uuid@8.3.2","vendor-chunks/yallist@4.0.0","vendor-chunks/preact-render-to-string@5.2.6_preact@10.29.1","vendor-chunks/lru-cache@6.0.0","vendor-chunks/cookie@0.7.2","vendor-chunks/oidc-token-hash@5.2.0","vendor-chunks/@panva+hkdf@1.2.1"], () => (__webpack_exec__("(rsc)/./node_modules/.pnpm/next@14.2.20_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fitineraries%2F%5Bid%5D%2Froute&page=%2Fapi%2Fitineraries%2F%5Bid%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fitineraries%2F%5Bid%5D%2Froute.ts&appDir=C%3A%5CUsers%5CJinx%5CDesktop%5Ctestsharingpc1%5Cjae-travel-complete%5Cjae-travel-app%5Capp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=C%3A%5CUsers%5CJinx%5CDesktop%5Ctestsharingpc1%5Cjae-travel-complete%5Cjae-travel-app&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();