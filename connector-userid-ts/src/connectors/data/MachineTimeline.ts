import axios, { AxiosResponse } from 'axios';
import {
  GET_MONGO_DATA,
  CREATE_MONGO_ROWS_URL,
  Protocol,
  VERSION
} from '../../utils/constants.js';

// Type definitions for MachineTimeline
export interface MachineTimelineConfig {
  userId: string;
  dataUrl: string;
  onPrem?: boolean;
  tz?: string;
  logTime?: boolean;
}

export interface MongoDataOptions {
  devID: string;
  limit?: number;
  startTime?: string;
  endTime?: string;
  onPrem?: boolean;
}

export interface CreateMongoRowsOptions {
  data: any; // Dynamic JSON data provided by end users
  onPrem?: boolean;
}

export default class MachineTimeline {
  private userId: string;
  private dataUrl: string;
  private onPrem: boolean;
  private tz: string;
  private logTime: boolean;
  public readonly version: string = VERSION;

  constructor({
    userId,
    dataUrl,
    onPrem = false,
    tz = 'UTC',
    logTime = false
  }: MachineTimelineConfig) {
    /**
     * A class to handle machine timeline and MongoDB data operations.
     * 
     * @param userId - The user ID used for authentication and identification in requests
     * @param dataUrl - The URL or IP address of the third-party server from which data is retrieved
     * @param onPrem - A flag indicating whether to use the on-premises server. If true, the on-premises server is used; otherwise, the cloud server is used
     * @param tz - The timezone to use for time-related operations. If not provided, defaults to UTC
     * @param logTime - Whether to log API response times
     */
    this.userId = userId;
    this.dataUrl = dataUrl;
    this.onPrem = onPrem;
    this.tz = tz;
    this.logTime = logTime;
  }

  private errorMessage(response: AxiosResponse | undefined, url: string): string {
    if (!response) {
      return `\n[URL] ${url}\n[EXCEPTION] No response received`;
    }
    return `\n[STATUS CODE] ${response.status}\n[URL] ${url}\n[SERVER INFO] ${response.headers.server || 'Unknown Server'}\n[RESPONSE] ${response.data}`;
  }

  private formatUrl(template: string, onPrem?: boolean): string {
    const protocol = (onPrem ?? this.onPrem) ? Protocol.HTTP : Protocol.HTTPS;
    return template.replace('{protocol}', protocol).replace('{data_url}', this.dataUrl);
  }

  private convertToIST(dateInput: string | Date | null, userTimezone: string = this.tz): string {
    /**
     * Converts a date/time from user's timezone to IST (Asia/Kolkata) format required by the API.
     * 
     * @param dateInput - Date string, Date object, or null (uses current time)
     * @param userTimezone - The timezone of the input date (defaults to instance timezone)
     * @returns Formatted date string in IST timezone (YYYY-MM-DD HH:mm:ss)
     */
    try {
      let inputDate: Date;

      if (dateInput === null || dateInput === undefined) {
        inputDate = new Date();
      } else if (typeof dateInput === 'string') {
        // Parse the string date assuming it's in the user's timezone
        inputDate = new Date(dateInput);
      } else {
        inputDate = dateInput;
      }

      // If the date is invalid, throw an error
      if (isNaN(inputDate.getTime())) {
        throw new Error(`Invalid date format: ${dateInput}`);
      }

      // Convert to IST using Intl.DateTimeFormat
      const istOptions: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };

      // If input timezone is not UTC and not IST, we need to handle it properly
      if (userTimezone !== 'UTC' && userTimezone !== 'Asia/Kolkata' && typeof dateInput === 'string') {
        // Create a date object considering the user's timezone
        const userOptions: Intl.DateTimeFormatOptions = {
          timeZone: userTimezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        };
        
        // Parse the date string as if it's in the user's timezone
        const dateParts = dateInput.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
        if (dateParts) {
          const [, year, month, day, hour, minute, second] = dateParts;
          
          // Create a date object in the user's timezone
          const userDate = new Date();
          userDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
          userDate.setHours(parseInt(hour), parseInt(minute), parseInt(second), 0);
          
          // Get the offset difference between user timezone and UTC
          const userOffset = this.getTimezoneOffset(userTimezone, userDate);
          const utcTime = userDate.getTime() - (userOffset * 60000);
          inputDate = new Date(utcTime);
        }
      }

      // Format the date in IST
      const formatter = new Intl.DateTimeFormat('sv-SE', istOptions);
      const formattedDate = formatter.format(inputDate);
      
      // Convert from ISO format (YYYY-MM-DD HH:mm:ss) to required format
      return formattedDate.replace('T', ' ');

    } catch (error: any) {
      console.error(`[TIMEZONE CONVERSION ERROR] ${error.message}`);
      // Fallback: return current time in IST format
      const now = new Date();
      return now.toLocaleString('sv-SE', { 
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace('T', ' ');
    }
  }

  private getTimezoneOffset(timezone: string, date: Date): number {
    /**
     * Get timezone offset in minutes for a given timezone and date
     */
    try {
      const utcDate = new Date(date.toLocaleString('sv-SE', { timeZone: 'UTC' }));
      const timezoneDate = new Date(date.toLocaleString('sv-SE', { timeZone: timezone }));
      return (timezoneDate.getTime() - utcDate.getTime()) / (1000 * 60);
    } catch (error) {
      console.warn(`[TIMEZONE OFFSET WARNING] Could not calculate offset for ${timezone}, using 0`);
      return 0;
    }
  }

  private processDataForInsertion(data: any): any {
    /**
     * Process data rows to convert timestamps to IST before insertion
     */
    if (!data || !data.rows) {
      return data;
    }

    const processedData = { ...data };
    processedData.rows = data.rows.map((row: any) => {
      if (!row.data) return row;

      const processedRow = { ...row };
      processedRow.data = { ...row.data };

      // Convert D0 field (timestamp) to IST if it exists
      if (processedRow.data.D0) {
        const originalD0 = processedRow.data.D0;
        processedRow.data.D0 = this.convertToIST(originalD0, this.tz);
        
        if (this.logTime) {
          console.log(`[TIMEZONE CONVERSION] D0: ${originalD0} (${this.tz}) -> ${processedRow.data.D0} (IST)`);
        }
      }

      // Convert any other timestamp fields that might be in the data
      Object.keys(processedRow.data).forEach(key => {
        const value = processedRow.data[key];
        // Check if the value looks like a timestamp string (YYYY-MM-DD HH:mm:ss format)
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(value) && key !== 'D0') {
          const originalValue = value;
          processedRow.data[key] = this.convertToIST(originalValue, this.tz);
          
          if (this.logTime) {
            console.log(`[TIMEZONE CONVERSION] ${key}: ${originalValue} (${this.tz}) -> ${processedRow.data[key]} (IST)`);
          }
        }
      });

      return processedRow;
    });

    return processedData;
  }

  private async getPaginatedData(url: string, payload: any, parallel: boolean): Promise<any> {
    /**
     * Sends a PUT request to the specified API endpoint and processes the response.
     */
    try {
      const startTime = Date.now();
      const response = await axios.put(url, payload, { 
        headers: { userID: this.userId } 
      });

      if (this.logTime) {
        const duration = (Date.now() - startTime) / 1000;
        console.log(`[NETWORK] API ${url} response time: ${duration.toFixed(4)} seconds`);
      }

      const data = response.data.data;

      if (data) {
        return parallel ? (data.rows || {}) : data;
      }

      throw new Error('Invalid response format');

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMessage = this.errorMessage(error.response, error.config?.url || 'unknown');
        console.error(`[EXCEPTION] ${error.name}: ${errorMessage}`);
      } else {
        console.error(`[EXCEPTION] ${error.message || error}`);
      }
      throw error;
    }
  }

  async getMongoData(options: MongoDataOptions): Promise<any[]> {
    /**
     * Retrieves data rows for a specific device from the custom table (MongoDB) with optional filtering.
     * Uses the /api/table/getRows3 endpoint as specified in the API documentation.
     * 
     * Time inputs are automatically converted from user's timezone to IST before querying.
     * 
     * @param options.devID - Required device identifier
     * @param options.limit - Optional limit on number of rows to return
     * @param options.startTime - Optional start time filter in format "YYYY-MM-DD HH:mm:ss" (in user's timezone)
     * @param options.endTime - Optional end time filter in format "YYYY-MM-DD HH:mm:ss" (in user's timezone)
     * @param options.onPrem - Optional flag for on-premises server usage
     * @returns Array of data rows for the specified device
     * 
     * @example
     * ```typescript
     * const machineTimeline = new MachineTimeline({
     *   userId: 'user123',
     *   dataUrl: 'api.example.com',
     *   tz: 'America/New_York' // User's timezone
     * });
     * 
     * const data = await machineTimeline.getMongoData({
     *   devID: 'Planwise_Production_01',
     *   limit: 100,
     *   startTime: '2025-01-01 09:00:00', // 9 AM in America/New_York timezone
     *   endTime: '2025-01-15 17:00:00'     // 5 PM in America/New_York timezone
     * });
     * // Times are automatically converted to IST before API call
     * 
     * // Returns:
     * // [{
     * //   _id: '67a98e7ba5b75209f9a85a0d',
     * //   devID: 'Planwise_Production_01',
     * //   data: {
     * //     D0: 'nan',
     * //     D1: 1739165220000,
     * //     D2: '40000',
     * //     F1: 'IMM-11',
     * //     F2: 'RIO FRONT',
     * //     F3: 'Planned',
     * //     D52: '2025-03-04 13:13:43',
     * //     D53: ...
     * //   }
     * // }]
     * ```
     */
    try {
      const { devID, limit, startTime, endTime, onPrem } = options;

      const url = this.formatUrl(GET_MONGO_DATA, onPrem);
      
      // Convert time filters to IST before sending to API
      const payload: any = {
        devID,
        ...(limit && { limit, rawData: true })
      };

      if (startTime) {
        const istStartTime = this.convertToIST(startTime, this.tz);
        payload.startTime = istStartTime;
        
        if (this.logTime) {
          console.log(`[TIMEZONE CONVERSION] startTime: ${startTime} (${this.tz}) -> ${istStartTime} (IST)`);
        }
      }

      if (endTime) {
        const istEndTime = this.convertToIST(endTime, this.tz);
        payload.endTime = istEndTime;
        
        if (this.logTime) {
          console.log(`[TIMEZONE CONVERSION] endTime: ${endTime} (${this.tz}) -> ${istEndTime} (IST)`);
        }
      }

      return await this.getPaginatedData(url, payload, false);

    } catch (error: any) {
      console.error(`[EXCEPTION] ${error.message || error}`);
      return [];
    }
  }

  async createMongoData(options: CreateMongoRowsOptions): Promise<{ success: boolean }> {
    /**
     * Creates new data rows for devices in the custom table using the createRows3 function.
     * Uses the PUT /api/table/createRows3 endpoint as specified in the API documentation.
     * 
     * Timestamps in the data are automatically converted from user's timezone to IST before insertion.
     * 
     * @param options.data - The data object containing rows to be created
     * @param options.onPrem - Optional flag for on-premises server usage
     * @returns Object indicating success status
     * 
     * @example
     * ```typescript
     * const machineTimeline = new MachineTimeline({
     *   userId: 'user123',
     *   dataUrl: 'api.example.com',
     *   tz: 'Europe/London' // User's timezone
     * });
     * 
     * const result = await machineTimeline.createMongoData({
     *   data: {
     *     rows: [
     *       {
     *         devID: "Planwise_Production_01",
     *         rawData: true,
     *         data: {
     *           D0: "2025-01-15 14:30:00", // 2:30 PM in Europe/London timezone
     *           D1: 1739165220000,
     *           D2: "40000",
     *           F1: "IMM-11",
     *           F2: "RIO FRONT",
     *           F3: "Planned"
     *         }
     *       }
     *     ],
     *     nonIndex: false // Optional, affects date validation
     *   }
     * });
     * // D0 timestamp is automatically converted to IST before insertion
     * 
     * // Returns: { success: true }
     * ```
     */
    try {
      const { data, onPrem } = options;

      // Process data to convert timestamps to IST
      const processedData = this.processDataForInsertion(data);

      const url = this.formatUrl(CREATE_MONGO_ROWS_URL, onPrem);
      const headers = { userID: this.userId };

      const startTime = Date.now();
      const response = await axios.put(url, processedData, { headers });

      if (this.logTime) {
        const duration = (Date.now() - startTime) / 1000;
        console.log(`[NETWORK] API ${url} response time: ${duration.toFixed(4)} seconds`);
      }

      return { success: response.data.success || false };

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMessage = this.errorMessage(error.response, error.config?.url || 'unknown');
        console.error(`[EXCEPTION] ${error.name}: ${errorMessage}`);
      } else {
        console.error(`[EXCEPTION] ${error.message || error}`);
      }
      return { success: false };
    }
  }
}
