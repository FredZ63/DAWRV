#!/usr/bin/swift
/**
 * ATLAS MIDI 2.0 Probe (macOS)
 *
 * Purpose:
 * - Enumerate CoreMIDI sources/destinations
 * - Read endpoint properties including kMIDIPropertyProtocolID (when available)
 * - Output JSON to stdout (consumed by ATLAS main process)
 *
 * This is a lightweight probe only (no UMP I/O yet).
 */

import Foundation
import CoreMIDI

func getStringProperty(_ obj: MIDIObjectRef, _ key: CFString) -> String? {
    var cfStr: Unmanaged<CFString>?
    let status = MIDIObjectGetStringProperty(obj, key, &cfStr)
    if status != noErr { return nil }
    return cfStr?.takeRetainedValue() as String?
}

func getIntProperty(_ obj: MIDIObjectRef, _ key: CFString) -> Int32? {
    var value: Int32 = 0
    let status = MIDIObjectGetIntegerProperty(obj, key, &value)
    if status != noErr { return nil }
    return value
}

func endpointInfo(_ endpoint: MIDIEndpointRef, kind: String) -> [String: Any] {
    let name = getStringProperty(endpoint, kMIDIPropertyName) ?? "(unknown)"
    let displayName = getStringProperty(endpoint, kMIDIPropertyDisplayName) ?? name
    let manufacturer = getStringProperty(endpoint, kMIDIPropertyManufacturer)
    let model = getStringProperty(endpoint, kMIDIPropertyModel)
    let uniqueID = getIntProperty(endpoint, kMIDIPropertyUniqueID)

    // Protocol ID (available on newer macOS / endpoints). Values align with MIDIProtocolID.
    // 1 = MIDI 1.0, 2 = MIDI 2.0 (UMP). If missing, treat as unknown (assume MIDI 1.0).
    let protocolID = getIntProperty(endpoint, kMIDIPropertyProtocolID)
    let supportsMIDI2 = (protocolID == 2)

    return [
        "kind": kind,
        "name": name,
        "displayName": displayName,
        "manufacturer": manufacturer as Any,
        "model": model as Any,
        "uniqueID": uniqueID as Any,
        "protocolID": protocolID as Any,
        "supportsMIDI2": supportsMIDI2
    ]
}

var endpoints: [[String: Any]] = []

let srcCount = MIDIGetNumberOfSources()
if srcCount > 0 {
    for i in 0..<srcCount {
        let ep = MIDIGetSource(i)
        endpoints.append(endpointInfo(ep, kind: "source"))
    }
}

let dstCount = MIDIGetNumberOfDestinations()
if dstCount > 0 {
    for i in 0..<dstCount {
        let ep = MIDIGetDestination(i)
        endpoints.append(endpointInfo(ep, kind: "destination"))
    }
}

let out: [String: Any] = [
    "success": true,
    "platform": "darwin",
    "endpoints": endpoints
]

let data = try JSONSerialization.data(withJSONObject: out, options: [.prettyPrinted, .sortedKeys])
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write("\n".data(using: .utf8)!)


