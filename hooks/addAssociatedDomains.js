/**
 * after_prepare hook for cordova-ios 8+.
 * Adds Associated Domains entitlement (applinks:vansite.eu) to both
 * Entitlements-Debug.plist and Entitlements-Release.plist using PlistBuddy.
 */
var path = require('path');
var fs = require('fs');
var execFileSync = require('child_process').execFileSync;

module.exports = function (ctx) {
  if (!ctx.opts.platforms || !ctx.opts.platforms.includes('ios')) {
    return;
  }

  var iosPath = path.join(ctx.opts.projectRoot, 'platforms', 'ios');
  var files = getEntitlementFiles(iosPath);

  if (files.length === 0) {
    console.warn('[cordova-plugin-deeplinks] No entitlements files found. Skipping Associated Domains setup.');
    return;
  }

  var domain = 'applinks:vansite.eu';

  files.forEach(function (file) {
    addAssociatedDomain(file, domain);
  });
};

function getEntitlementFiles(iosPath) {
  var files = [];

  // cordova-ios 8+: App/Entitlements-*.plist
  var appPath = path.join(iosPath, 'App');
  ['Entitlements-Debug.plist', 'Entitlements-Release.plist'].forEach(function (name) {
    var p = path.join(appPath, name);
    if (fs.existsSync(p)) {
      files.push(p);
    }
  });

  if (files.length > 0) {
    return files;
  }

  // Fallback for cordova-ios <8: {ProjectName}/Resources/{ProjectName}.entitlements
  try {
    var entries = fs.readdirSync(iosPath);
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].endsWith('.xcodeproj')) {
        var projName = entries[i].replace('.xcodeproj', '');
        var entPath = path.join(iosPath, projName, 'Resources', projName + '.entitlements');
        if (fs.existsSync(entPath)) {
          files.push(entPath);
        }
        break;
      }
    }
  } catch (e) {
    // ignore
  }

  return files;
}

function addAssociatedDomain(file, domain) {
  try {
    // Add the array key if it doesn't exist
    plistBuddy(file, 'Add :com.apple.developer.associated-domains array');
  } catch (e) {
    // Already exists
  }

  // Check if domain is already present
  try {
    var existing = plistBuddy(file, 'Print :com.apple.developer.associated-domains');
    if (existing.includes(domain)) {
      console.log('[cordova-plugin-deeplinks] ' + domain + ' already in ' + path.basename(file));
      return;
    }
  } catch (e) {
    // Key doesn't exist yet
  }

  try {
    plistBuddy(file, 'Add :com.apple.developer.associated-domains:0 string ' + domain);
    console.log('[cordova-plugin-deeplinks] Added ' + domain + ' to ' + path.basename(file));
  } catch (e) {
    console.warn('[cordova-plugin-deeplinks] Failed to add ' + domain + ' to ' + path.basename(file) + ': ' + e.message);
  }
}

function plistBuddy(file, command) {
  return execFileSync('/usr/libexec/PlistBuddy', ['-c', command, file], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })
    .toString()
    .trim();
}
