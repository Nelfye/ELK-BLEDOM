let characteristics = []; // Tableau pour stocker les caractéristiques des appareils
let selectedDevices = new Set(); // Ensemble pour stocker les appareils sélectionnés

document.getElementById('searchBtn').addEventListener('click', searchBLEDom);
document.getElementById('setColorBtn').addEventListener('click', setColorFromPicker);
document.getElementById('setEffectBtn').addEventListener('click', setEffect);
document.getElementById('intensityRange').addEventListener('input', updateIntensityValue);

async function searchBLEDom() {
    document.getElementById('status').textContent = 'Recherche de dispositifs Bluetooth...';
    try {
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['0000fff0-0000-1000-8000-00805f9b34fb'],
        });

        document.getElementById('status').textContent = `Dispositif trouvé : ${device.name}`;
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('0000fff0-0000-1000-8000-00805f9b34fb');
        const characteristic = await service.getCharacteristic('0000fff3-0000-1000-8000-00805f9b34fb');
        characteristics.push(characteristic); // Ajoute la caractéristique au tableau

        // Ajoute l'appareil à la liste avec une case à cocher
        addDeviceToList(device.name, characteristic);

    } catch (error) {
        console.error('Erreur Bluetooth :', error);
        document.getElementById('status').textContent = 'Erreur : ' + error.message;
    }
}

function addDeviceToList(name, characteristic) {
    const devicesList = document.getElementById('devicesList');
    const deviceItem = document.createElement('div');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = name;
    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            selectedDevices.add(characteristic);
        } else {
            selectedDevices.delete(characteristic);
        }
    });

    deviceItem.appendChild(checkbox);
    deviceItem.appendChild(document.createTextNode(name));
    devicesList.appendChild(deviceItem);
}

function setColorFromPicker() {
    const hexColor = document.getElementById('colorPicker').value;
    const rgbColor = hexToRgb(hexColor);
    const intensity = document.getElementById('intensityRange').value / 100; // Récupère l'intensité
    selectedDevices.forEach(characteristic => {
        setColor(characteristic, {
            r: Math.round(rgbColor.r * intensity),
            g: Math.round(rgbColor.g * intensity),
            b: Math.round(rgbColor.b * intensity),
        });
    });
}

function setEffect() {
    const effect = document.getElementById('effectSelect').value;
    if (effect) {
        selectedDevices.forEach(characteristic => {
            setModeEffect(characteristic, effect);
        });
    }
}

function setModeEffect(characteristic, effect) {
    const effects = {
        red: 0x80,
        blue: 0x81,
        green: 0x82,
        cyan: 0x83,
        yellow: 0x84,
        magenta: 0x85,
        white: 0x86,
        jump_rgb: 0x87,
        jump_rgbycmw: 0x88,
        gradient_rgb: 0x89,
        gradient_rgbycmw: 0x8a,
        blink_rgbycmw: 0x95,
    };
    if (effect in effects) {
        const command = new Uint8Array([0x7e, 0x00, 0x03, limitHex(effects[effect]), 0x03, 0x00, 0x00, 0x00, 0xef]).buffer;
        sendCommand(characteristic, command);
    } else {
        console.error(effect + " is not a valid effect");
    }
    document.getElementById("effectSelect").value = "null";
}

function sendCommand(characteristic, command) {
    characteristic.writeValue(command).then(() => {
        console.log('Commande envoyée :', command);
    }).catch((error) => {
        console.error('Erreur d\'envoi de commande :', error);
    });
}

function setColor(characteristic, color) {
    const command = new Uint8Array([
        0x7e, 0x00, 0x05, 0x03, 
        limitHex(color.r), limitHex(color.g), limitHex(color.b), 
        0x00, 0xef
    ]);
    sendCommand(characteristic, command);
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
    };
}

function limitHex(value) {
    return Math.min(255, Math.max(0, value));
}

function updateIntensityValue() {
    const value = document.getElementById('intensityRange').value;
    document.getElementById('intensityValue').textContent = value + '%'; // Met à jour le pourcentage
    setColorFromPicker(); // Met à jour la couleur à chaque ajustement de l'intensité
}
