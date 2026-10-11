# Changelog

## [0.4.0](https://github.com/Felpasw/boticario/compare/api-v0.3.0...api-v0.4.0) (2026-10-11)


### ✨ Features

* **api:** authenticate POST /connections by shared ingest key ([2c0d68a](https://github.com/Felpasw/boticario/commit/2c0d68a1d957172bd5d09faf862341a022b6afdb))
* Wi-Fi Insights MVP — ingest + metrics + dashboard + e2e [BOT-32] ([7feaf82](https://github.com/Felpasw/boticario/commit/7feaf826e98642f554ed28e3af1f6edf8c36a263))


### 🐛 Correções

* **ci:** provide ingest env vars to the api test job ([5a5c9b4](https://github.com/Felpasw/boticario/commit/5a5c9b4d422bf0a87e9ffb6e546e582a852deb93))

## [0.3.0](https://github.com/Felpasw/boticario/compare/api-v0.2.0...api-v0.3.0) (2026-10-10)


### ✨ Features

* add cookie session auth end to end ([7336512](https://github.com/Felpasw/boticario/commit/73365126df0cd410ac2f880cc907a8395120cc52))
* **api:** add argon2 hasher, sessions repository and session id generator ([012e7b0](https://github.com/Felpasw/boticario/commit/012e7b03807682595fb9379bad4c59b5f9a2beae))
* **api:** add cookie session auth with guard and standard error envelope ([b543435](https://github.com/Felpasw/boticario/commit/b543435693d9f4949ec32bd6f287b4ea3207fff7))
* **api:** add user and session prisma models with migration ([258cd62](https://github.com/Felpasw/boticario/commit/258cd6218f62d0d6ebcfd3331e610e56bccb029d))
* **api:** add users module with prisma repository ([93e6886](https://github.com/Felpasw/boticario/commit/93e68867d10cb3834132c9f45923035a85e1859f))

## [0.2.0](https://github.com/Felpasw/boticario/compare/api-v0.1.0...api-v0.2.0) (2026-10-09)


### ✨ Features

* **api:** add nestjs skeleton with health module ([2763fbb](https://github.com/Felpasw/boticario/commit/2763fbbcb7bebba1e758e821a7eafbd6e264e651))
* **repo:** bootstrap monorepo with api, web and shared skeletons ([21c766c](https://github.com/Felpasw/boticario/commit/21c766cea4271b3271ea3f0642e19bd46d76d184))
* **shared:** add shared package with health response schema ([e7f030b](https://github.com/Felpasw/boticario/commit/e7f030b35f542251719e383875e407098bc46fba))

## 0.1.0 (2026-10-09)

### 🎉 Initial baseline

First version tracked automatically by release-please. Any commit landing on `main` after this point feeds the per-package changelog.
