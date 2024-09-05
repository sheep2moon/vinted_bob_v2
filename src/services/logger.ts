export class Logger {
    static log(type: "ERROR" | "INFO", message: any) {
        const timestamp = new Date().toISOString();
        const formattedMessage = `${timestamp} ${type}: ${message}`;
        console.log(formattedMessage);
    }
}
