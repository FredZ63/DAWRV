# AI Schema Fix - Delete Track Function

## Error
```
❌ AI processing error: Error: Invalid schema for function 'delete_track': 
True is not of type 'array'.
```

## Root Cause
The OpenAI function calling schema requires the `required` field to be an **array of property names**, not a boolean value.

### Incorrect Schema (Before)
```javascript
{
    name: 'delete_track',
    description: 'Delete a specific track by number',
    parameters: {
        track_number: { 
            type: 'number', 
            description: 'Track number to delete', 
            required: true  // ❌ Wrong: required as boolean in property
        }
    },
    action: 'deletetrack'
}
```

When formatted for OpenAI API, this was being sent as:
```javascript
{
    type: 'function',
    function: {
        name: 'delete_track',
        description: '...',
        parameters: {
            type: 'object',
            properties: {
                track_number: { 
                    type: 'number', 
                    description: '...',
                    required: true  // ❌ Invalid!
                }
            },
            required: []
        }
    }
}
```

## Solution

### Correct Schema (After)
```javascript
{
    name: 'delete_track',
    description: 'Delete a specific track by number (e.g., "delete track 5"). Important: Extract the track number from phrases like "delete track 5" or "remove track 3".',
    parameters: {
        track_number: { 
            type: 'number', 
            description: 'Track number to delete (1-based)'
        }
    },
    required: ['track_number'],  // ✅ Correct: array at tool level
    action: 'deletetrack'
}
```

### Updated `formatToolsForAPI()` Function
```javascript
formatToolsForAPI() {
    return this.tools.map(tool => ({
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            parameters: {
                type: 'object',
                properties: tool.parameters || {},
                required: tool.required || []  // ✅ Use tool's required array
            }
        }
    }));
}
```

## OpenAI Function Schema Format

According to OpenAI's API documentation, the correct format is:

```javascript
{
    type: 'function',
    function: {
        name: 'function_name',
        description: 'What the function does',
        parameters: {
            type: 'object',
            properties: {
                param1: { type: 'string', description: '...' },
                param2: { type: 'number', description: '...' }
            },
            required: ['param1']  // Array of required parameter names
        }
    }
}
```

**Key Points:**
1. `required` is an array at the `parameters` level, NOT in individual properties
2. `required` contains the **names** of required properties (e.g., `['track_number']`)
3. If a parameter is optional, don't include its name in the `required` array

## Files Modified

1. **`/src/renderer/scripts/ai-agent.js` (Line 211-219)**
   - Fixed `delete_track` tool definition
   - Moved `required` to tool level as an array
   - Improved description with examples

2. **`/src/renderer/scripts/ai-agent.js` (Line 641-654)**
   - Updated `formatToolsForAPI()` to use `tool.required` array
   - Changed from hardcoded `required: []` to `required: tool.required || []`

## Testing

After restart, try:
- "Delete track 5" → Should work without schema errors
- "Remove track 3" → Should work without schema errors
- "Delete track" (no number) → RHEA asks "Which track?"

## Impact

This fix ensures:
✅ No more schema validation errors from OpenAI API
✅ AI properly understands that track_number is required
✅ AI will extract track numbers from natural language
✅ Better error messages if user doesn't specify track number

---
**Fix Date:** November 19, 2025
**Status:** Complete ✅



