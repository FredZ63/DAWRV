#!/usr/bin/env python3
"""
Test different mixer action IDs to find the correct one
"""
import requests
import time

REAPER_HOST = 'localhost'
REAPER_PORT = 8080

def test_action(action_id, description):
    """Test a REAPER action ID"""
    url = f'http://{REAPER_HOST}:{REAPER_PORT}/_/{action_id}'
    print(f'\n🧪 Testing Action {action_id}: {description}')
    print(f'   URL: {url}')
    
    try:
        response = requests.get(url, timeout=2)
        if response.status_code == 200:
            print(f'   ✅ Action executed successfully')
            print(f'   Response: {response.text[:100]}')
            return True
        else:
            print(f'   ❌ Failed: HTTP {response.status_code}')
            return False
    except Exception as e:
        print(f'   ❌ Error: {e}')
        return False

print('=' * 60)
print('🎛️  REAPER Mixer Action ID Test')
print('=' * 60)

# Test various mixer-related action IDs
actions_to_test = [
    (40078, 'Current action (might be wrong)'),
    (40083, 'View: Toggle mixer visible'),
    (40084, 'View: Show mixer'),
    (40085, 'View: Hide mixer'),
    (40072, 'View: Toggle mixer (alternative)'),
    (41679, 'Mixer: Toggle mixer visible'),
]

print('\n⚠️  Testing all actions automatically...')
print('Watch REAPER to see which action actually toggles the mixer.')
print('')

for action_id, description in actions_to_test:
    test_action(action_id, description)
    time.sleep(2)  # Wait 2 seconds between tests

print('\n' + '=' * 60)
print('✅ Testing complete!')
print('=' * 60)
print('\nNOTE: The action that actually toggled the mixer is the correct one!')
print('Update rhea.js with the working action ID.')

