import RequestHandler from "../lib/utilities/request_handler";

export class ApiClient {
    static async get<T>(endpoint: string): Promise<{ success: boolean; data?: T; message?: string }> {
        return RequestHandler.fetchData("GET", endpoint);
    }

    static async post<T>(endpoint: string, data?: any): Promise<{ success: boolean; data?: T; message?: string }> {
        return RequestHandler.fetchData("POST", endpoint, data);
    }
}