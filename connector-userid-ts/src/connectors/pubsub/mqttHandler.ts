import mqtt from 'mqtt';
import { Buffer } from 'buffer';

export interface MqttConfig {
  broker: string;
  port: number;
  username: string;
  password: string;
}

export interface DevicePayload {
  device: string;
  time: number;
  data: Array<{
    tag: string;
    value: string;
  }>;
}

export class MqttConnector {
  private client: mqtt.MqttClient | null = null;
  private config: MqttConfig;
  private isConnected: boolean = false;

  constructor(config: MqttConfig) {
    this.config = config;
  }

  /**
   * Connect to MQTT broker
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `mqtt://${this.config.broker}:${this.config.port}`;
      
      this.client = mqtt.connect(url, {
        username: this.config.username,
        password: this.config.password,
        connectTimeout: 10000,
        reconnectPeriod: 1000,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log(`Connected to MQTT broker at ${url}`);
        resolve();
      });

      this.client.on('error', (error: Error) => {
        console.error('MQTT connection error:', error);
        reject(error);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        console.log('MQTT connection closed');
      });
    });
  }

  /**
   * Publish data to a topic
   */
  async publish(topic: string, payload: any): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('MQTT client is not connected. Call connect() first.');
    }

    return new Promise((resolve, reject) => {
      const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
      
      this.client!.publish(topic, message, { qos: 1 }, (error?: Error) => {
        if (error) {
          console.error('Failed to publish message:', error);
          reject(error);
        } else {
          console.log(`Message published to topic: ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Publish device data using the standard format
   * @param deviceId - The device identifier
   * @param data - Array of tag-value pairs
   * @param time - Optional timestamp in UTC unix milliseconds. If not provided, uses current time
   */
  async publishDeviceData(deviceId: string, data: Array<{tag: string, value: string}>, time?: number): Promise<void> {
    const topic = `devicesIn/${deviceId}/data`;
    const payload: DevicePayload = {
      device: deviceId,
      time: time ?? Date.now(),
      data: data
    };

    return this.publish(topic, payload);
  }

  /**
   * Subscribe to a topic and return data via callback
   */
  async subscribe(topic: string, callback: (topic: string, message: any) => void): Promise<void> {
    if (!this.client || !this.isConnected) {
      throw new Error('MQTT client is not connected. Call connect() first.');
    }

    return new Promise((resolve, reject) => {
      this.client!.subscribe(topic, { qos: 1 }, (error: Error | null) => {
        if (error) {
          console.error('Failed to subscribe to topic:', error);
          reject(error);
        } else {
          console.log(`Subscribed to topic: ${topic}`);
          resolve();
        }
      });

      this.client!.on('message', (receivedTopic: string, message: Buffer) => {
        if (receivedTopic === topic || this.topicMatches(topic, receivedTopic)) {
          try {
            const parsedMessage = JSON.parse(message.toString());
            callback(receivedTopic, parsedMessage);
          } catch (error) {
            // If JSON parsing fails, return raw message
            callback(receivedTopic, message.toString());
          }
        }
      });
    });
  }

  /**
   * Subscribe to device data using the standard topic pattern
   */
  async subscribeToDeviceData(deviceId: string, callback: (deviceData: DevicePayload) => void): Promise<void> {
    const topic = `devicesIn/${deviceId}/data`;
    
    return this.subscribe(topic, (receivedTopic, message) => {
      callback(message as DevicePayload);
    });
  }

  /**
   * Subscribe to all device data using wildcard
   */
  async subscribeToAllDevices(callback: (deviceId: string, deviceData: DevicePayload) => void): Promise<void> {
    const topic = 'devicesIn/+/data';
    
    return this.subscribe(topic, (receivedTopic, message) => {
      // Extract device ID from topic: devicesIn/{deviceId}/data
      const deviceId = receivedTopic.split('/')[1];
      callback(deviceId, message as DevicePayload);
    });
  }

  /**
   * Close the MQTT connection
   */
  async close(): Promise<void> {
    if (this.client) {
      return new Promise((resolve) => {
        this.client!.end(false, {}, () => {
          this.isConnected = false;
          console.log('MQTT connection closed successfully');
          resolve();
        });
      });
    }
  }

  /**
   * Check if the client is connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Helper method to check if topic matches (supports wildcards)
   */
  private topicMatches(subscribed: string, received: string): boolean {
    const subParts = subscribed.split('/');
    const recParts = received.split('/');

    if (subParts.length !== recParts.length) return false;

    for (let i = 0; i < subParts.length; i++) {
      if (subParts[i] !== '+' && subParts[i] !== '#' && subParts[i] !== recParts[i]) {
        return false;
      }
      if (subParts[i] === '#') {
        return true; // # matches everything after
      }
    }

    return true;
  }
} 
