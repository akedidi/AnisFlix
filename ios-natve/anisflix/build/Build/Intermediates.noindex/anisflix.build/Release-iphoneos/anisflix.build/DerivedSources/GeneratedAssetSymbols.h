#import <Foundation/Foundation.h>

#if __has_attribute(swift_private)
#define AC_SWIFT_PRIVATE __attribute__((swift_private))
#else
#define AC_SWIFT_PRIVATE
#endif

/// The "Chromecast" asset catalog image resource.
static NSString * const ACImageNameChromecast AC_SWIFT_PRIVATE = @"Chromecast";

/// The "LaunchSplash" asset catalog image resource.
static NSString * const ACImageNameLaunchSplash AC_SWIFT_PRIVATE = @"LaunchSplash";

#undef AC_SWIFT_PRIVATE
