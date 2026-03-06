import Foundation

let str = "https://storm.vodvidl.site/proxy/file2%2FQS4AvnRIH%2BpTYJ32YTwbrjbi8VFAi0vpFXWaxgzlUQ17kHFKOc~JcVGIOjnAygGqpGwMc2SHPdMdE9MxtlCC9yln58Tokx~qa0yoxjh0Zv1mrNUHtQLtRWmwWP6H~mqpi~PBd3%2BGQtU986KToCTB2mAOVDCKs6~JbkBVvWnguok%3D%2FcGxheWxpc3QubTN1OA%3D%3D.m3u8?headers={\"referer\":\"https://videostr.net/\",\"origin\":\"https://videostr.net\"}&host=https://thunderleaf12.online"

// Normal URL parse
let url = URL(string: str)
print("1. URL(string:): ", url?.absoluteString ?? "nil")

// Force percent encode
let allowed = CharacterSet.urlQueryAllowed
let encoded = str.addingPercentEncoding(withAllowedCharacters: allowed)!
let url2 = URL(string: encoded)
print("2. URL(string: encoded): ", url2?.absoluteString ?? "nil")

