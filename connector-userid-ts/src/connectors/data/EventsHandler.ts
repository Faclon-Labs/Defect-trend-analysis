import axios, { AxiosResponse } from 'axios';
import {
  PUBLISH_EVENT_URL,
  GET_EVENTS_IN_TIMESLOT_URL,
  GET_EVENT_DATA_COUNT_URL,
  GET_EVENT_CATEGORIES_URL,
  GET_DETAILED_EVENT_URL,
  GET_MONGO_DATA,
  GET_MAINTENANCE_MODULE_DATA,
  GET_DEVICE_DATA,
  GET_SENSOR_ROWS,
  GET_DEVICE_METADATA_MONGO_URL,
  Protocol,
  VERSION
} from '../../utils/constants.js';
import DataAccess from './DataAccess.js';
import { start } from 'repl';

// Type definitions for EventsHandler
export interface EventsHandlerConfig {
  userId: string;
  dataUrl: string;
  onPrem?: boolean;
  tz?: string;
  logTime?: boolean;
}

export interface PublishEventOptions {
  message: string;
  metaData: string;
  hoverData: string;
  createdOn?: string;
  eventTagsList?: string[];
  eventNamesList?: string[];
  title?: string;
  onPrem?: boolean;
}

export interface EventsInTimeslotOptions {
  startTime: string | Date;
  endTime?: string | Date;
  onPrem?: boolean;
}

export interface EventDataCountOptions {
  endTime?: string | Date;
  count?: number;
  onPrem?: boolean;
}

export interface DetailedEventOptions {
  eventTagsList?: string[];
  startTime?: string | Date;
  endTime?: string | Date;
  onPrem?: boolean;
}

export interface MongoDataOptions {
  devID: string;
  limit?: number;
  startTime?: string;
  endTime?: string;
  onPrem?: boolean;
}

export interface MaintenanceModuleDataOptions {
  startTime: number | string | Date;
  endTime?: number | string | Date;
  remarkGroup?: string[];
  eventId?: string[];
  maintenanceModuleId?: string;
  operator?: 'count' | 'activeDuration' | 'inactiveDuration';
  dataPrecision?: number;
  periodicity?: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  cycleTime?: string;
  weekStart?: number;
  monthStart?: number;
  yearStart?: number;
  shifts?: any[];
  shiftOperator?: 'sum' | 'mean' | 'median' | 'mode' | 'min' | 'max';
  filter?: Record<string, any>;
  onPrem?: boolean;
}

export interface DeviceDataOptions {
  devices?: string[];
  n?: number;
  endTime?: string;
  startTime?: string;
  onPrem?: boolean;
}

export interface SensorRowsOptions {
  deviceId?: string;
  sensor?: string;
  value?: string;
  endTime?: string;
  startTime?: string;
  alias?: boolean;
  onPrem?: boolean;
}

export interface CreateMongoRowsOptions {
  data: any; // Dynamic JSON data provided by end users
  onPrem?: boolean;
}

export interface EventCategory {
  _id: string;
  name: string;
}

export interface ApiResponse<T = any> {
  data: T;
  errors?: string[];
  success?: boolean;
}

export default class EventsHandler {
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
  }: EventsHandlerConfig) {
    /**
     * A class to handle event-related operations.
     * 
     * @param userId - The user ID used for authentication and identification in requests
     * @param dataUrl - The URL or IP address of the third-party server from which event data is retrieved
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

  private isoUtcTime(time?: string | Date): string {
    /**
     * Converts a given time to an ISO 8601 formatted string in UTC.
     * If no time is provided, the current time in UTC is used.
     */
    if (time === undefined || time === null) {
      return new Date().toISOString();
    }

    let dateTime: Date;
    if (typeof time === 'string') {
      dateTime = new Date(time);
    } else {
      dateTime = time;
    }

    // If the date is invalid, throw an error
    if (isNaN(dateTime.getTime())) {
      throw new Error(`Invalid date format: ${time}`);
    }

    return dateTime.toISOString();
  }

  private formatUrl(template: string, onPrem?: boolean): string {
    const protocol = (onPrem ?? this.onPrem) ? Protocol.HTTP : Protocol.HTTPS;
    return template.replace('{protocol}', protocol).replace('{data_url}', this.dataUrl);
  }

  async publishEvent(options: PublishEventOptions): Promise<any> {
    /**
     * Publish an event with the given details to the server.
     * 
     * @param options - Configuration options for publishing the event
     * @returns The response data from the server
     */
    try {
      const {
        message,
        metaData,
        hoverData,
        createdOn,
        eventTagsList,
        eventNamesList,
        title,
        onPrem
      } = options;

      let finalEventTagsList = eventTagsList;

      if (eventNamesList && eventNamesList.length > 0) {
        // Initialize event_tags_list as an empty list, as event_names_list will be used to populate it
        finalEventTagsList = [];

        // Fetch the available event categories from the server
        const categories = await this.getEventCategories({ onPrem });

        // Iterate through each name in event_names_list to find its corresponding tag ID
        for (const tagName of eventNamesList) {
          const matched = categories.find((item: EventCategory) => item.name === tagName);
          if (!matched) {
            throw new Error(`Tag '${tagName}' not found in data.`);
          }
          finalEventTagsList.push(matched._id);
        }
      }

      // Ensure that at least one tag is present in event_tags_list after processing
      if (!finalEventTagsList || finalEventTagsList.length === 0) {
        throw new Error('No event tags found.');
      }

      const url = this.formatUrl(PUBLISH_EVENT_URL, onPrem);
      const headers = { userID: this.userId };
      const payload = {
        title: title || null,
        message,
        metaData,
        eventTags: finalEventTagsList,
        hoverData,
        createdOn
      };

      const startTime = Date.now();
      const response = await axios.post(url, payload, { headers });

      if (this.logTime) {
        const duration = (Date.now() - startTime) / 1000;
        console.log(`[NETWORK] API ${url} response time: ${duration.toFixed(4)} seconds`);
      }

      if (!response.data.data) {
        throw new Error('Invalid response format');
      }

      return response.data.data;

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

  async getEventsInTimeslot(options: EventsInTimeslotOptions): Promise<any[]> {
    /**
     * Retrieves events within a specified time slot.
     * 
     * @param options - Configuration options for retrieving events
     * @param options.startTime - Start time filter in format "YYYY-MM-DD HH:mm:ss"
     * @param options.endTime - End time filter in format "YYYY-MM-DD HH:mm:ss"
     * @param options.onPrem - Optional flag for on-premises server usage
     * @returns A list of events found within the specified time slot
     *
     * @example
     * ```typescript
     * const eventsHandler = new EventsHandler({
     *   userId: '63d913894b6cb4',
     *   dataUrl: 'datae.io'
     * });
     * 
     * const result = await eventsHandler.getEventsInTimeslot({
     *   startTime: "2025-03-18 00:00:00",
     *   endTime: "2025-03-18 23:59:59"
     * });
     * // Example output:
     * // [
     * //   {
     * //     _id: '67d927f864ced1922',
     * //     title: 'ALERT: High Current THD',
     * //     devID: 'PPG8',
     * //     message: 'High Current THD\nDevice:- MDB - UTILITY\nPhase 1 Current THD : 84.6 % ...',
     * //     eventTags: ['641ab5f7c8e8'],
     * //     createdOn: '2025-03-18T07:59:57.556Z',
     * //     date: '18/03/2025',
     * //     time: '1:29:57 pm',
     * //     isRead: 'no'
     * //   },
     * //   {
     * //     _id: '67d8fe55cd9ec8844',
     * //     title: 'ALERT: Low Voltage Alert',
     * //     devID: 'PPAP6',
     * //     message: 'Low Voltage below 237\nDevice:- LT Panel\nLine to Neutral Voltage: 235.5 V ...',
     * //     eventTags: ['64030b089c4ab'],
     * //     createdOn: '2025-03-18T05:02:13.035Z',
     * //     date: '18/03/2025',
     * //     time: '10:32:13 am',
     * //     isRead: 'no'
     * //   }
     * // ]
     * ```
     *
     * Each event object contains:
     * - _id: Unique event identifier
     * - title: Event title/alert
     * - devID: Device identifier
     * - message: Event message
     * - eventTags: Array of event tag IDs
     * - createdOn: Event creation timestamp
     * - date: Event date (formatted)
     * - time: Event time (formatted)
     * - isRead: Read status
     */
    try {
      const { startTime, endTime, onPrem } = options;

      // Convert start_time and end_time to iso utc timestamps
      const startTimeIso = this.isoUtcTime(startTime);
      const endTimeIso = this.isoUtcTime(endTime);

      // Raise an error if end_time is before start_time
      if (new Date(endTimeIso) < new Date(startTimeIso)) {
        throw new Error(
          `Invalid time range: start_time(${startTimeIso}) should be before end_time(${endTimeIso}).`
        );
      }

      const url = this.formatUrl(GET_EVENTS_IN_TIMESLOT_URL, onPrem);
      const headers = { userID: this.userId };
      const payload = { startTime: startTimeIso, endTime: endTimeIso };

      const startTimeReq = Date.now();
      const response = await axios.put(url, payload, { headers });

      if (this.logTime) {
        const duration = (Date.now() - startTimeReq) / 1000;
        console.log(`[NETWORK] API ${url} response time: ${duration.toFixed(4)} seconds`);
      }

      if (!response.data.data) {
        throw new Error('Invalid response format');
      }

      return response.data.data;

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMessage = this.errorMessage(error.response, error.config?.url || 'unknown');
        console.error(`[EXCEPTION] ${error.name}: ${errorMessage}`);
      } else {
        console.error(`[EXCEPTION] ${error.message || error}`);
      }
      return [];
    }
  }

  async getEventDataCount(options: EventDataCountOptions = {}): Promise<any[]> {
    /**
     * Retrieve a specified number of event data records up to a given end time.
     * 
     * @param options - Configuration options for retrieving event data count
     * @param options.endTime - Optional end time filter in format "YYYY-MM-DD HH:mm:ss"
     * @param options.count - Optional number of records to return (default: 10, max: 10000)
     * @param options.onPrem - Optional flag for on-premises server usage
     * @returns Array of event data records
     * 
     * @example
     * ```typescript
     * const eventsHandler = new EventsHandler({
     *   userId: '63d913294b6cb4',
     *   dataUrl: 'datadse.io'
     * });
     * 
     * const result = await eventsHandler.getEventDataCount({
     *   count: 1,
     *   endTime: "2023-06-14 12:00:00"
     * });
     * 
     * // Example output:
     * // [
     * //   {
     * //     "_id": "6489a115981814bc2",
     * //     "title": "ALERT: High Voltage Alert",
     * //     "devID": "PPAP6",
     * //     "message": "Low Voltage above 250\nDevice:- LT Panel\nLine to Neutral Voltage: 244.1 V",
     * //     "eventTags": ["64030ba2e44089c4c5"],
     * //     "createdOn": "2023-06-14T11:14:29.500Z",
     * //     "isRead": "yes",
     * //     "date": "14/06/2023",
     * //     "time": "4:44:29 pm"
     * //   }
     * // ]
     * ```
     * 
     * Each event record contains:
     * - _id: Unique identifier for the event
     * - title: Event title/alert message
     * - devID: Device identifier
     * - message: Detailed event message
     * - eventTags: Array of event category IDs
     * - createdOn: Event creation timestamp
     * - isRead: Read status of the event
     * - date: Formatted date of the event
     * - time: Formatted time of the event
     */
    try {
      const { endTime, count = 10, onPrem } = options;

      if (count > 10000) {
        throw new Error('Count should be less than or equal to 10000.');
      }

      // Convert end_time to iso utc timestamp
      const endTimeIso = this.isoUtcTime(endTime);

      const url = this.formatUrl(GET_EVENT_DATA_COUNT_URL, onPrem);
      const headers = { userID: this.userId };
      const payload = { endTime: endTimeIso, count };

      const startTime = Date.now();
      const response = await axios.put(url, payload, { headers });

      if (this.logTime) {
        const duration = (Date.now() - startTime) / 1000;
        console.log(`[NETWORK] API ${url} response time: ${duration.toFixed(4)} seconds`);
      }

      if (!response.data.data) {
        throw new Error('Invalid response format');
      }

      return response.data.data;

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMessage = this.errorMessage(error.response, error.config?.url || 'unknown');
        console.error(`[EXCEPTION] ${error.name}: ${errorMessage}`);
      } else {
        console.error(`[EXCEPTION] ${error.message || error}`);
      }
      return [];
    }
  }

  async getEventCategories(options: { onPrem?: boolean } = {}): Promise<EventCategory[]> {
    /**
     * Retrieve a list of event categories from the server.
     * 
     * @param options - Configuration options
     * @param options.onPrem - Optional flag for on-premises server usage
     * @returns Array of event categories with their properties
     * 
     * @example
     * ```typescript
     * const eventsHandler = new EventsHandler({
     *   userId: '63d918294b6cb4',
     *   dataUrl: 'datase.io'
     * });
     * 
     * const categories = await eventsHandler.getEventCategories();
     * // Example output:
     * // [
     * //   {
     * //     "color": "#ff0000",
     * //     "_id": "63eb7644233da",
     * //     "name": "High Current",
     * //     "icon": "warning",
     * //     "shape": "circle",
     * //     "description": "High Current"
     * //   },
     * //   {
     * //     "color": "#ff77c8",
     * //     "_id": "64030b44089c4ab",
     * //     "name": "Low Voltage",
     * //     "icon": "warning",
     * //     "shape": "circle",
     * //     "description": "Low Voltage"
     * //   }
     * // ]
     * ```
     * 
     * Each category object contains:
     * - color: Hex color code for visualization
     * - _id: Unique identifier for the category
     * - name: Display name of the category
     * - icon: Icon type (e.g., "warning")
     * - shape: Shape for visualization (e.g., "circle")
     * - description: Description of the event category
     */
    try {
      const { onPrem } = options;

      const url = this.formatUrl(GET_EVENT_CATEGORIES_URL, onPrem);
      const headers = { userID: this.userId };

      const startTime = Date.now();
      const response = await axios.get(url, { headers });

      if (this.logTime) {
        const duration = (Date.now() - startTime) / 1000;
        console.log(`[NETWORK] API ${url} response time: ${duration.toFixed(4)} seconds`);
      }

      if (!response.data.data) {
        throw new Error('Invalid response format');
      }

      return response.data.data;

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMessage = this.errorMessage(error.response, error.config?.url || 'unknown');
        console.error(`[EXCEPTION] ${error.name}: ${errorMessage}`);
      } else {
        console.error(`[EXCEPTION] ${error.message || error}`);
      }
      return [];
    }
  }

  async getDetailedEvent(options: DetailedEventOptions = {}): Promise<any[]> {
    /**
     * Retrieve detailed event data for a specified time range and event tags.
     * 
     * @param options.eventTagsList - Optional array of event tag IDs to filter events
     * @param options.startTime - Optional start time filter in format "YYYY-MM-DD HH:mm:ss"
     * @param options.endTime - Optional end time filter in format "YYYY-MM-DD HH:mm:ss"
     * @param options.onPrem - Optional flag for on-premises server usage
     * @returns Array of detailed event data records
     * 
     * @example
     * ```typescript
     * const eventsHandler = new EventsHandler({
     *   userId: '63d913294b6cb4',
     *   dataUrl: 'datnse.io'
     * });
     * 
     * // First get event categories
     * const categories = await eventsHandler.getEventCategories();
     * // Example categories output:
     * // [
     * //   {
     * //     "color": "#ff0000",
     * //     "_id": "63ebab644233da",
     * //     "name": "High Current",
     * //     "icon": "warning",
     * //     "shape": "circle",
     * //     "description": "High Current"
     * //   },
     * //   {
     * //     "color": "#ff77c8",
     * //     "_id": "64030b8089c4ab",
     * //     "name": "Low Voltage",
     * //     "icon": "warning",
     * //     "shape": "circle",
     * //     "description": "Low Voltage"
     * //   }
     * // ]
     * 
     * // Then get detailed events for specific categories
     * const result = await eventsHandler.getDetailedEvent({
     *   eventTagsList: ["6403e44089c4ab"], // Low Voltage event tag
     *   startTime: '2025-03-01 07:00:00',
     *   endTime: '2025-03-30 07:00:00'
     * });
     * ```
     * 
     * Note: The function uses pagination internally to fetch all available events.
     * Events are fetched in batches of 1000 records per page until all data is retrieved.
     */
    try {
      const { eventTagsList, startTime, endTime, onPrem } = options;

      // Convert start_time and end_time to iso utc timestamps
      const startTimeIso = this.isoUtcTime(startTime);
      const endTimeIso = this.isoUtcTime(endTime);

      // If event_tags_list is not provided, fetch all event categories
      let finalEventTagsList = eventTagsList;
      if (!finalEventTagsList) {
        const categories = await this.getEventCategories({ onPrem });
        finalEventTagsList = categories.map((category: EventCategory) => category._id);
      }

      const url = this.formatUrl(GET_DETAILED_EVENT_URL, onPrem);
      const headers = { userID: this.userId };
      const payload = {
        startTime: startTimeIso,
        endTime: endTimeIso,
        eventTags: finalEventTagsList
      };

      let page = 1;
      const rawData: any[] = [];

      // Loop to fetch data until there is no more data to fetch
      while (true) {
        console.log(`[INFO] Fetching Data from page ${page}`);

        const startTimeReq = Date.now();
        const response = await axios.put(`${url}/${page}/1000`, payload, { headers });

        if (this.logTime) {
          const duration = (Date.now() - startTimeReq) / 1000;
          console.log(`[NETWORK] API ${url} response time: ${duration.toFixed(4)} seconds`);
        }

        const responseData = response.data as ApiResponse;

        // Check for errors in the API response
        if (responseData.success === false) {
          throw new Error('API response indicates failure');
        }

        const pageData = responseData.data?.data || [];
        rawData.push(...pageData);

        page += 1;

        if (rawData.length >= (responseData.data?.totalCount || 0)) {
          break;
        }
      }

      return rawData;

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMessage = this.errorMessage(error.response, error.config?.url || 'unknown');
        console.error(`[EXCEPTION] ${error.name}: ${errorMessage}`);
      } else {
        console.error(`[EXCEPTION] ${error.message || error}`);
      }
      return [];
    }
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
  
      // DEBUG: Log the actual response structure
      console.log('Response structure:', JSON.stringify(response.data, null, 2));


      if (this.logTime) {
        const duration = (Date.now() - startTime) / 1000;
        console.log(`[NETWORK] API ${url} response time: ${duration.toFixed(4)} seconds`);
      }

      // For device data endpoint, the structure is different
      if (url.includes('getRowsByDevices')) {
        const responseData = response.data;
        if (responseData && responseData.rows) {
          return responseData.rows;  // Return rows directly like Python version
        }
      } else {
        // Keep original logic for other endpoints
        const data = response.data.data;
        if (data) {
          return parallel ? (data.rows || {}) : data;
        }
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

  async getMaintenanceModuleData(options: MaintenanceModuleDataOptions): Promise<Record<string, any>> {
    /**
     * Fetch maintenance module data based on the provided parameters.
     * 
     * @param options - Configuration options for retrieving maintenance data
     * @param options.startTime - Start time in Unix timestamp (milliseconds) or date string
     * @param options.endTime - End time in Unix timestamp (milliseconds) or date string
     * @param options.remarkGroup - Array of remark group IDs to filter by
     * @param options.eventId - Array of event IDs to filter by
     * @param options.maintenanceModuleId - ID of the maintenance module
     * @param options.operator - Type of operation to perform ('count' | 'activeDuration' | 'inactiveDuration')
     * @param options.dataPrecision - Number of decimal places in the result
     * @param options.periodicity - Time period for data aggregation ('hour' | 'day' | 'week' | 'month' | 'quarter' | 'year')
     * @param options.onPrem - Optional flag for on-premises server usage
     * @returns Object with timestamps as keys and corresponding values
     * 
     * @example
     * ```typescript
     * const eventsHandler = new EventsHandler({
     *   userId: '64807ea38fc3236',
     *   dataUrl: 'danse.io'
     * });
     * 
     * const result = await eventsHandler.getMaintenanceModuleData({
     *   startTime: 1735669800000,  // Unix timestamp for start date
     *   endTime: 1737829800000,    // Unix timestamp for end date
     *   operator: '', //string for operator
     *   periodicity: '', // periodicity
     *   dataPrecision: 1,
     *   remarkGroup: [''], // array
     *   eventId: [''], array
     *   maintenanceModuleId: ''  // id for maintainance module
     * });
     * 
     * // Example output:
     * // {
     * //   "2024-12-31T18:30:00Z": 0,
     * //   "2025-01-01T18:30:00Z": 0,
     * //   "2025-01-07T18:30:00Z": 31308.6,  // Partial day
     * //   "2025-01-08T18:30:00Z": 86400,    // Full day (24 hours in seconds)
     * //   "2025-01-13T18:30:00Z": 64910.7,  // Partial day
     * //   "2025-01-22T18:30:00Z": 8.4,      // Short duration
     * //   "2025-01-23T18:30:00Z": 0
     * //   ....                   // more values can be present
     * // }
     * ```
     * 
     * The returned object contains:
     * - Keys: ISO timestamps representing the start of each period
     * - Values: Duration in seconds (for activeDuration/inactiveDuration) or count (for count operator)
     *   - 0: No activity during that period
     *   - 86400: Full day of activity (24 hours in seconds)
     *   - Other values: Partial duration of activity
     */
    try {
      const {
        startTime,
        endTime,
        remarkGroup,
        eventId,
        maintenanceModuleId,
        operator,
        dataPrecision,
        periodicity,
        cycleTime,
        weekStart,
        monthStart,
        yearStart,
        shifts,
        shiftOperator,
        filter,
        onPrem
      } = options;

      // Create a DataAccess instance to convert times to Unix timestamps
      const dataAccess = new DataAccess({
        userId: this.userId,
        dataUrl: this.dataUrl,
        dsUrl: '', // Empty for this use case
        tz: this.tz
      });

      // Convert start_time and end_time to Unix timestamps
      const startTimeUnix = this.timeToUnix(startTime);
      const endTimeUnix = this.timeToUnix(endTime);

      // Validate that the start time is before the end time
      if (endTimeUnix < startTimeUnix) {
        throw new Error(
          `Invalid time range: start_time(${startTime}) should be before end_time(${endTime}).`
        );
      }

      // Build the API payload with the required parameters
      const payload: any = {
        userID: this.userId,
        startTime: startTimeUnix,
        endTime: endTimeUnix,
        remarkGroup,
        eventID: eventId,
        maintenanceModuleID: maintenanceModuleId,
        operator,
        timezone: this.tz,
        dataPrecision
      };

      // Add periodicity and related parameters if specified
      if (periodicity) {
        Object.assign(payload, {
          periodicity,
          weekStart,
          monthStart,
          yearStart,
          eventID: eventId
        });
      }

      // Add cycle time to the payload if provided
      if (cycleTime) {
        payload.cycleTime = cycleTime;
      }

      // Add shift-related parameters if provided
      if (shifts) {
        Object.assign(payload, { shifts, shiftOperator });
      }

      if (filter) {
        payload.filter = filter;
      }

      const url = this.formatUrl(GET_MAINTENANCE_MODULE_DATA, onPrem);

      const startTimeReq = Date.now();
      const response = await axios.put(url, payload);

      if (this.logTime) {
        const duration = (Date.now() - startTimeReq) / 1000;
        console.log(`[NETWORK] API ${url} response time: ${duration.toFixed(4)} seconds`);
      }

      if (response.data.errors) {
        throw new Error('API response contains errors');
      }

      return response.data.data;

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMessage = this.errorMessage(error.response, error.config?.url || 'unknown');
        console.error(`[EXCEPTION] ${error.name}: ${errorMessage}`);
      } else {
        console.error(`[EXCEPTION] ${error.message || error}`);
      }
      return {};
    }
  }

  private timeToUnix(time: string | number | Date | null = null): number {
    /**
     * Convert time to Unix timestamp in milliseconds
     */
    if (time === null || time === undefined) {
      return Date.now();
    }

    if (typeof time === 'number') {
      return time;
    }

    if (typeof time === 'string') {
      return new Date(time).getTime();
    }

    if (time instanceof Date) {
      return time.getTime();
    }

    throw new Error(`Invalid time format: ${time}`);
  }

  /**
   * Fetch device data from the API with optional filters for time range and device list.
   *
   * @param options - Configuration options for retrieving device data
   * @returns Array of device data records
   *
   * @example
   * ```typescript
   * const eventsHandler = new EventsHandler({
   *   userId: 'your-user-id',
   *   dataUrl: 'your-data-url',
   *   onPrem: false,
   *   tz: 'UTC'
   * });
   *
   * const result = await eventsHandler.getDeviceData({
   *   devices: ["device1", "device2"],
   *   startTime: "2025-01-27 07:00:00",
   *   endTime: "2025-01-28 06:59:59"
   * });
   *
   * // Example output structure:
   * // [
   * //   {
   * //     _id: "record-id-1",
   * //     devID: "device1",
   * //     data: {
   * //       D0: "start-time",
   * //       D1: "end-time",
   * //       D2: "status",
   * //       D3: "reason",
   * //       D6: "value1",
   * //       D7: "value2",
   * //       ... // more fields
   * //       fromVMS: false
   * //     }
   * //   },
   * //   {
   * //     _id: "record-id-2",
   * //     devID: "device2",
   * //     data: {
   * //       D0: "start-time",
   * //       D1: "end-time",
   * //       D2: "status",
   * //       D3: "reason",
   * //       D6: "value1",
   * //       D7: "value2",
   * //       ... // more fields
   * //       fromVMS: false
   * //     }
   * //   }
   * // ]
   * ```
   *
   * Each record contains:
   * - _id: Unique identifier for the record
   * - devID: Device identifier
   * - data: Object with device data fields (D0, D1, D2, ...), including status, times, and other metrics
   *   - fromVMS: boolean flag
   */
  async getDeviceData(options: DeviceDataOptions = {}): Promise<any[]> {
    try {
      const { devices, n = 5000, startTime, endTime, onPrem } = options;

      const url = this.formatUrl(GET_DEVICE_DATA, onPrem);
      const payload: any = {
        devices,
        page: 1,
        limit: n,
        rawData: true,
      };
      if (startTime) {
        payload.startTime = startTime;
      }
      
      if (endTime) {
        payload.endTime = endTime;
      }
      const data = await this.getPaginatedData(url, payload, false);
      return data;

    } catch (error: any) {
      console.error(`[EXCEPTION] ${error.message || error}`);
      return [];
    }
  }

  /**
   * Retrieve device data rows from the server based on sensor parameters and optional time range filters.
   *
   * @param options - Configuration options for retrieving sensor rows
   * @returns Array of sensor data records
   *
   * @example
   * ```typescript
   * const eventsHandler = new EventsHandler({
   *   userId: 'your-user-id',
   *   dataUrl: 'your-data-url',
   *   onPrem: false,
   *   tz: 'UTC'
   * });
   *
   * const result = await eventsHandler.getSensorRows({
   *   deviceId: 'PHEXT_L1ne',
   *   sensor: 'D0',
   *   value: '2025-05-08 12:49:53',
   *   startTime: '2025-05-08 12:00:00',
   *   endTime: '2025-05-08 14:00:00'
   * });
   *
   * // Example output (partial):
   * // [
   * //   {
   * //     _id: "",
   * //     devID: "",
   * //     data: {
   * //       D0: "2025-05-08 12:49:53",
   * //       D1: "2025-05-08 12:59:39",
   * //       D2: "Downtime",
   * //       D3: "MC Setting Time",
   * //       D4: "220044",
   * //       D5: "800033.0",
   * //       D6: "0.00",
   * //       D7: "586.0",
   * //       ... // more fields
   * //       fromVMS: false
   * //     }
   * //   },
   * //   {
   * //     _id: "", // id for the user
   * //     devID: "",  // device ID
   * //     data: {
   * //       D0: "2025-05-08 12:59:39",
   * //       D1: "2025-05-08 13:18:01",
   * //       D2: "Downtime",
   * //       D3: "Lunch/Breakfast",
   * //       D4: "220044",
   * //       D5: "800033.0",
   * //       D6: "0.00",
   * //       D7: "1102.0",
   * //       ... // more fields
   * //       fromVMS: false
   * //     }
   * //   }
   * // ]
   * ```
   *
   * Each record contains:
   * - _id: Unique identifier for the record
   * - devID: Device identifier
   * - data: Object with sensor data fields (D0, D1, D2, ...), including status, times, and other metrics
   *   - fromVMS: boolean flag
   */
  async getSensorRows(options: SensorRowsOptions): Promise<any[]> {
    try {
      const { deviceId, sensor, value, endTime, startTime, alias = false, onPrem } = options;
  
      const url = this.formatUrl(GET_SENSOR_ROWS, onPrem);
      
      // Match Python payload structure exactly
      const params: any = {
        devID: deviceId,    // Python uses "devID"
        key: sensor,        // Python uses "key" 
        value: value
      };
  
      // Use Python's time parameter names
      if (startTime) {
        params.sTime = startTime;  // Python uses "sTime"
      }
      
      if (endTime) {
        params.eTime = endTime;    // Python uses "eTime"
      }
  
      // GET request logic (matching Python's requests.get)
      const requestStartTime = Date.now();
      const response = await axios.get(url, { 
        params: params,  // Send as query parameters for GET
        headers: { userID: this.userId } 
      });
  
      if (this.logTime) {
        const duration = (Date.now() - requestStartTime) / 1000;
        console.log(`[NETWORK] API ${url} response time: ${duration.toFixed(4)} seconds`);
      }
  
      const responseData = response.data;
      if (responseData && responseData.data) {
        return responseData.data;  // Python expects response.data
      }
  
      throw new Error('Invalid response format');
  
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMessage = this.errorMessage(error.response, error.config?.url || 'unknown');
        console.error(`[EXCEPTION] ${error.name}: ${errorMessage}`);
      } else {
        console.error(`[EXCEPTION] ${error.message || error}`);
      }
      console.error(`[EXCEPTION] ${error.message || error}`);
      return [];
    }
  }

  async getDeviceMetadata(deviceId: string, onPrem?: boolean): Promise<Record<string, any>> {
    /**
     * Fetches metadata for a specific device.
     *
     * @param deviceId - The device identifier
     * @param onPrem - Optional flag for on-premises server usage
     * @returns An object where each key is a sensor/data channel (e.g., D0, D1, Status, RSSI),
     *          and the value is an array of objects describing the variable and its display label.
     *
     * @example
     * ```typescript
     * const eventsHandler = new EventsHandler({
     *   userId: '',   // the id for the user
     *   dataUrl: 'date.io'  // the data url 
     * });
     * 
     * const metadata = await eventsHandler.getDeviceMetadata('PPA_G8');
     * // Example output:
     * // {
     * //   "D0": [
     * //     { "customShow": "Raw Variable", "customVariable": "PPAPEM_G8_D0" },
     * //     { "customShow": "Processed Reading", "customVariable": "1*PPAPEM_G8_D0+0" }
     * //   ],
     * //   "D34": [
     * //     { "customShow": "Raw Variable", "customVariable": "PPAPEM_G8_D34" },
     * //     { "customShow": "Processed Reading", "customVariable": "1*PPAPEM_G8_D34+0" }
     * //   ],
     * //   "Status": [
     * //     { "customShow": "Raw Variable", "customVariable": "PPAPEM_G8_Status" },
     * //     { "customShow": "Processed Reading", "customVariable": "1*PPAPEM_G8_Status+0" }
     * //   ],
     * //   "RSSI": [
     * //     { "customShow": "Raw Variable", "customVariable": "PPAPEM_G8_RSSI" },
     * //     { "customShow": "Processed Reading", "customVariable": "1*PPAPEM_G8_RSSI+0" }
     * //   ]
     * // }
     * ```
     *
     * Each key (e.g., D0, D34, Status, RSSI) represents a sensor or data channel.
     * Each value is an array containing two objects:
     *   - First object: Raw variable information
     *     - customShow: Label for the raw variable
     *     - customVariable: The raw variable name
     *   - Second object: Processed reading information
     *     - customShow: Label for the processed reading
     *     - customVariable: The formula for calculating the processed reading
     */
    try {
      const url = this.formatUrl(GET_DEVICE_METADATA_MONGO_URL, onPrem);

      const startTime = Date.now();
      const response = await axios.get(`${url}/${this.userId}`, {
        params: { devID: deviceId }
      });

      if (this.logTime) {
        const duration = (Date.now() - startTime) / 1000;
        console.log(`[NETWORK] API ${url} response time: ${duration.toFixed(4)} seconds`);
      }

      if (!response.data.data) {
        throw new Error('Invalid response format');
      }

      return response.data.data;

    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMessage = this.errorMessage(error.response, error.config?.url || 'unknown');
        console.error(`[EXCEPTION] ${error.name}: ${errorMessage}`);
      } else {
        console.error(`[EXCEPTION] ${error.message || error}`);
      }
      return {};
    }
  }
}