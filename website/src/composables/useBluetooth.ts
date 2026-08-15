import type { SpotByteChannel } from "./spotTransport";

const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const RX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const TX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const MAX_BLUETOOTH_WRITE = 20;

interface BluetoothCharacteristicLike extends EventTarget {
  value: DataView | null;
  startNotifications(): Promise<void>;
  writeValue(data: Uint8Array): Promise<void>;
}

interface BluetoothServiceLike {
  getCharacteristic(uuid: string): Promise<BluetoothCharacteristicLike>;
}

interface BluetoothGattServerLike {
  connected: boolean;
  connect(): Promise<BluetoothGattServerLike>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BluetoothServiceLike>;
}

interface BluetoothDeviceLike extends EventTarget {
  gatt?: BluetoothGattServerLike;
}

interface BluetoothAdapterLike {
  requestDevice(options: {
    filters: Array<{ services: string[] }>;
    optionalServices: string[];
  }): Promise<BluetoothDeviceLike>;
}

function getBluetooth(): BluetoothAdapterLike | undefined {
  return (
    navigator as Navigator & { bluetooth?: BluetoothAdapterLike }
  ).bluetooth;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createBluetoothChannel(): SpotByteChannel {
  let device: BluetoothDeviceLike | null = null;
  let rxCharacteristic: BluetoothCharacteristicLike | null = null;
  let txCharacteristic: BluetoothCharacteristicLike | null = null;
  let disconnectNotified = false;
  const dataListeners = new Set<(bytes: Uint8Array) => void>();
  const disconnectListeners = new Set<(error?: unknown) => void>();

  function notifyDisconnect(disconnectError?: unknown): void {
    if (disconnectNotified) return;
    disconnectNotified = true;
    for (const listener of disconnectListeners) listener(disconnectError);
  }

  function handleNotifications(event: Event): void {
    const value = (event.target as BluetoothCharacteristicLike | null)?.value;
    if (!value) return;

    const bytes = new Uint8Array(
      value.buffer,
      value.byteOffset,
      value.byteLength,
    );
    for (const listener of dataListeners) listener(bytes);
  }

  function handleDisconnected(): void {
    const disconnectedDevice = device;
    if (disconnectedDevice) {
      disconnectedDevice.removeEventListener(
        "gattserverdisconnected",
        handleDisconnected,
      );
    }
    txCharacteristic?.removeEventListener(
      "characteristicvaluechanged",
      handleNotifications,
    );
    device = null;
    rxCharacteristic = null;
    txCharacteristic = null;
    notifyDisconnect();
  }

  function resetConnection(): void {
    txCharacteristic?.removeEventListener(
      "characteristicvaluechanged",
      handleNotifications,
    );
    device?.removeEventListener(
      "gattserverdisconnected",
      handleDisconnected,
    );
    device = null;
    rxCharacteristic = null;
    txCharacteristic = null;
  }

  async function close(): Promise<void> {
    const currentDevice = device;
    if (!currentDevice) return;

    const gatt = currentDevice.gatt;
    resetConnection();
    if (gatt?.connected) gatt.disconnect();
    disconnectNotified = false;
  }

  async function connect(): Promise<void> {
    await close();
    const bluetooth = getBluetooth();
    if (!bluetooth) {
      throw new Error("Web Bluetooth API not supported in this browser.");
    }

    const nextDevice = await bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID],
    });
    const nextGatt = nextDevice.gatt;
    if (!nextGatt) throw new Error("Bluetooth GATT server is unavailable.");

    device = nextDevice;
    disconnectNotified = false;
    nextDevice.addEventListener(
      "gattserverdisconnected",
      handleDisconnected,
    );

    try {
      const server = await nextGatt.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      rxCharacteristic = await service.getCharacteristic(RX_UUID);
      txCharacteristic = await service.getCharacteristic(TX_UUID);
      await txCharacteristic.startNotifications();
      txCharacteristic.addEventListener(
        "characteristicvaluechanged",
        handleNotifications,
      );
    } catch (connectError) {
      resetConnection();
      if (nextGatt.connected) nextGatt.disconnect();
      throw new Error(`Bluetooth connection failed: ${errorMessage(connectError)}`);
    }
  }

  async function write(bytes: Uint8Array): Promise<void> {
    if (!rxCharacteristic) {
      throw new Error("Bluetooth characteristic not available.");
    }

    for (let offset = 0; offset < bytes.length; offset += MAX_BLUETOOTH_WRITE) {
      await rxCharacteristic.writeValue(
        bytes.slice(offset, offset + MAX_BLUETOOTH_WRITE),
      );
    }
  }

  return {
    connect,
    write,
    close,
    onData(listener) {
      dataListeners.add(listener);
      return () => dataListeners.delete(listener);
    },
    onDisconnect(listener) {
      disconnectListeners.add(listener);
      return () => disconnectListeners.delete(listener);
    },
  };
}
