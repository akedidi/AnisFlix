#!/bin/bash
echo "🔍 Surveillance des logs AnisFlix..."
xcrun simctl spawn booted log stream --predicate "process == 'AnisFlix'" --style compact | grep -E "(ANISFLIX|TABBAR|BOTTOMNAV)"
