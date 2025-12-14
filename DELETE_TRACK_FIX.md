# Delete Track Fix

## Problem
User reports: "I ask RHEA to delete a specific track and each time she replies 'deleting track' but the track I have specified is not being deleted."

## Root Cause
The `deletetrack` command was executing REAPER action 40005 (Track: Remove tracks) directly, which **deletes the currently selected track**, not the track number specified in the voice command.

When user said: "delete track 5"
- RHEA matched the command ✅
- RHEA said "deleting track" ✅
- RHEA executed action 40005 ❌ (deletes **selected** track, not track 5)
- Track 5 was NOT selected, so wrong track was deleted or nothing happened

## Solution
Modified the track deletion logic to:
1. **Extract the track number** from the voice command
2. **Select that specific track first** using `executeTrackCommand('select', trackNum)`
3. **Then delete it** using action 40005

### Code Changes

#### 1. Added 'deletetrack' to track command actions (rhea.js line 3119)
```javascript
const trackActions = ['selecttrack', 'mutetrack', 'unmutetrack', 'solotrack', 'unsolotrack', 'armtracknum', 'settrackvolume', 'settrackpan', 'deletetrack'];
```

#### 2. Added deletetrack handler in processTrackCommand (rhea.js lines 2293-2325)
```javascript
if (action === 'deletetrack') {
    // Extract track number from command (e.g., "delete track 5")
    const track = trackNum;
    
    if (!track) {
        // No track number specified - ask for clarification
        return { success: false, error: 'Which track would you like to delete? Please say the track number.' };
    }
    
    // Select the track first, then delete it
    console.log(`🗑️  Deleting track ${track}...`);
    
    // Step 1: Select the track
    const selectResult = await window.api.executeTrackCommand('select', track);
    if (!selectResult.success) {
        return { success: false, error: `Could not select track ${track}` };
    }
    
    // Small delay to ensure track is selected
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Step 2: Delete the selected track (action 40005)
    if (window.api.executeReaperAction) {
        const deleteResult = await window.api.executeReaperAction(40005);
        return deleteResult.success ? {
            success: true,
            message: `Deleted track ${track}`,
            context: { deletedTrack: track }
        } : { success: false, error: `Failed to delete track ${track}` };
    } else {
        return { success: false, error: 'Delete action not available' };
    }
}
```

#### 3. Updated AI agent description (ai-agent.js lines 212-217)
```javascript
{
    name: 'delete_track',
    description: 'Delete a specific track by number (e.g., "delete track 5")',
    parameters: {
        track_number: { type: 'number', description: 'Track number to delete', required: true }
    },
    action: 'deletetrack'
}
```

## How It Works Now

### Example: "Delete track 5"

1. **Voice command recognized**: "delete track 5"
2. **Track number extracted**: `trackNum = 5`
3. **Select track 5**: Executes OSC command `/track/5/select` with value `1`
4. **Wait 50ms**: Ensures selection completes
5. **Delete selected track**: Executes REAPER action 40005
6. **Confirm**: RHEA says "Deleted track 5"

### Example: "Delete track" (no number)

1. **Voice command recognized**: "delete track"
2. **No track number found**: `trackNum = null`
3. **Ask for clarification**: RHEA says "Which track would you like to delete? Please say the track number."
4. **User responds**: "Track 3"
5. **Deletion proceeds** with track 3

## Voice Commands Supported

✅ "Delete track 5"
✅ "Remove track 3"
✅ "Delete track number 7"
✅ "Get rid of track 2"

## Testing Steps

1. **Restart DAWRV** to load the updated code
2. Open REAPER with multiple tracks (at least 5)
3. Start voice listening
4. Say: "delete track 3"
5. **Expected**: Track 3 should be deleted, RHEA confirms "Deleted track 3"
6. Try: "delete track 5"
7. **Expected**: Track 5 should be deleted

## Files Modified

1. `/src/renderer/scripts/rhea.js` - Added deletetrack handler
2. `/src/renderer/scripts/ai-agent.js` - Updated AI tool description

---
**Fix Date:** November 19, 2025
**Status:** Complete ✅
**Tested:** Pending user verification



