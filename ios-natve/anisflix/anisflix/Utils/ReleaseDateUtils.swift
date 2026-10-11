//
//  ReleaseDateUtils.swift
//  anisflix
//
//  TMDB usually only exposes YYYY-MM-DD for air/release dates (no reliable air time).
//  Same-day titles are treated as released only after a cutoff hour, unless an
//  explicit time / ISO datetime is provided.
//

import Foundation

enum ReleaseDateUtils {
    static let defaultTimeZoneIdentifier = "Europe/Paris"
    static let defaultSameDayCutoffHour = 20

    /// Latest YYYY-MM-DD that discover endpoints should accept as already released.
    static func maxReleasedDateString(
        timeZoneIdentifier: String = defaultTimeZoneIdentifier,
        sameDayCutoffHour: Int = defaultSameDayCutoffHour
    ) -> String {
        let tz = TimeZone(identifier: timeZoneIdentifier) ?? .current
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = tz

        let now = Date()
        let todayStr = dateString(from: now, calendar: calendar)
        let hour = calendar.component(.hour, from: now)
        if hour >= sameDayCutoffHour {
            return todayStr
        }

        guard let yesterday = calendar.date(byAdding: .day, value: -1, to: now) else {
            return todayStr
        }
        return dateString(from: yesterday, calendar: calendar)
    }

    static func isReleaseDateAvailable(
        _ dateStr: String?,
        timeStr: String? = nil,
        timeZoneIdentifier: String = defaultTimeZoneIdentifier,
        sameDayCutoffHour: Int = defaultSameDayCutoffHour,
        missingDateMeansReleased: Bool = true
    ) -> Bool {
        guard let raw = dateStr?.trimmingCharacters(in: .whitespacesAndNewlines),
              !raw.isEmpty else {
            return missingDateMeansReleased
        }

        // Full ISO datetime (rare on TMDB, but handle if present)
        if raw.contains("T") {
            let iso = ISO8601DateFormatter()
            iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = iso.date(from: raw) ?? ISO8601DateFormatter().date(from: raw) {
                return date <= Date()
            }
            return missingDateMeansReleased
        }

        let datePart = String(raw.prefix(10))
        guard datePart.range(of: #"^\d{4}-\d{2}-\d{2}$"#, options: .regularExpression) != nil else {
            return missingDateMeansReleased
        }

        let tz = TimeZone(identifier: timeZoneIdentifier) ?? .current
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = tz

        let now = Date()
        let todayStr = dateString(from: now, calendar: calendar)
        if datePart < todayStr { return true }
        if datePart > todayStr { return false }

        let hour = calendar.component(.hour, from: now)
        let minute = calendar.component(.minute, from: now)

        if let releaseMinutes = parseTimeToMinutes(timeStr) {
            let nowMinutes = hour * 60 + minute
            return nowMinutes >= releaseMinutes
        }

        return hour >= sameDayCutoffHour
    }

    private static func dateString(from date: Date, calendar: Calendar) -> String {
        let y = calendar.component(.year, from: date)
        let m = calendar.component(.month, from: date)
        let d = calendar.component(.day, from: date)
        return String(format: "%04d-%02d-%02d", y, m, d)
    }

    private static func parseTimeToMinutes(_ timeStr: String?) -> Int? {
        guard let timeStr = timeStr?.trimmingCharacters(in: .whitespacesAndNewlines),
              !timeStr.isEmpty else { return nil }
        let parts = timeStr.split(separator: ":")
        guard parts.count >= 2,
              let hours = Int(parts[0]),
              let minutes = Int(parts[1]) else { return nil }
        return hours * 60 + minutes
    }
}
