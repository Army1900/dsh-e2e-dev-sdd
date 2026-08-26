import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
import type { SddProjectService } from './project-service.ts';
export declare const SDD_API_PATH = "/api/dsh-e2e-dev-sdd";
export declare function makeSddRoute(service: SddProjectService): WebRoute;
