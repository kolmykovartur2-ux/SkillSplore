# Dependency licences

All runtime and build dependencies use permissive open-source licences (MIT, Apache-2.0,
BSD-2-Clause, MIT-0). None impose copyleft obligations on SkillSplore's own source, so the platform can
be continued, hosted privately, licensed or sold without licence conflicts. **Confirm this catalogue
after any dependency change**, and take independent legal advice before a resale or relicensing.

## Direct dependencies

| Package | Version | Licence |
| --- | --- | --- |
| @aws-sdk/client-s3 | 3.x | Apache-2.0 |
| @prisma/client | 5.22.0 | Apache-2.0 |
| bcryptjs | 2.4.3 | MIT |
| connect-pg-simple | 10.0.0 | MIT |
| cors | 2.8.x | MIT |
| dotenv | 16.x | BSD-2-Clause |
| express | 4.x | MIT |
| express-rate-limit | 7.x | MIT |
| express-session | 1.x | MIT |
| helmet | 8.x | MIT |
| multer | 1.4.5-lts | MIT |
| nodemailer | 6.x | MIT-0 |
| pg | 8.x | MIT |
| pino | 9.x | MIT |
| pino-http | 10.x | MIT |
| zod | 3.x | MIT |
| prisma | 5.22.0 | Apache-2.0 |
| tsx | 4.x | MIT |
| typescript | 5.x | Apache-2.0 |
| vitest | 2.x | MIT |
| supertest | 7.x | MIT |
| react | 18.x | MIT |
| react-dom | 18.x | MIT |
| react-router-dom | 6.x | MIT |
| vite | 5.x | MIT |
| @vitejs/plugin-react | 4.x | MIT |
| concurrently | 9.x | MIT |

Infrastructure images used by the local stack — `postgres` (PostgreSQL Licence), `minio/minio`
(AGPL-3.0, run as an unmodified external service), and `axllent/mailpit` (MIT) — are **development/demo
tooling**, not linked into or distributed with the application. MinIO is optional: the app also
supports a local-filesystem storage driver and any other S3-compatible provider.

## Regenerating the full transitive report

```bash
npx license-checker-rseidelsohn --summary        # counts by licence type
npx license-checker-rseidelsohn --json > licenses-full.json   # full detail
```

Review the output whenever dependencies change, especially before relicensing or resale.
