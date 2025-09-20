import Expo
import React
import ReactAppDependencyProvider
 
@UIApplicationMain
public class AppDelegate: ExpoAppDelegate, RNAppAuthAuthorizationFlowManager {
  var window: UIWindow?
 
  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  // Required by RNAppAuthAuthorizationFlowManager protocol
  public weak var authorizationFlowManagerDelegate:
     RNAppAuthAuthorizationFlowManagerDelegate?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()
 
    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)
 
#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
 
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
 
  // Linking API
  public override func application(
      _ app: UIApplication,
      open url: URL,
      options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
      if let authorizationFlowManagerDelegate = self
        .authorizationFlowManagerDelegate
      {
        if authorizationFlowManagerDelegate.resumeExternalUserAgentFlow(with: url)
        {
          return true
        }
      }
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }
 
  // Universal Links
  public override func application(
      _ application: UIApplication,
      continue userActivity: NSUserActivity,
      restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
    ) -> Bool {

      // Handle Universal-Link–style OAuth redirects first
      if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
        let delegate = authorizationFlowManagerDelegate,
        delegate.resumeExternalUserAgentFlow(with: userActivity.webpageURL)
      {
        return true
      }

      // Fall back to React Native’s own Linking logic
      return RCTLinkingManager.application(
        application,
        continue: userActivity,
        restorationHandler: restorationHandler
      )
    }
}
 
class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins
 
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }
 
  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}