using System;
using System.Text;

namespace WSU3.Web
{
    /// <summary>
    /// 桥消息的**信封**：所有消息统一形状（docs/design/02-bridge-protocol.md §1）。
    /// <c>Payload</c> 保留原始 JSON 片段，由各消息自己用 <see cref="UnityEngine.JsonUtility"/> 解析。
    /// </summary>
    public readonly struct BridgeEnvelope
    {
        public readonly string Type;
        public readonly int Version;
        public readonly int Seq;
        /// <summary>原始 payload 片段（可能是 <c>null</c> 字面量或空串）。</summary>
        public readonly string Payload;

        public BridgeEnvelope(string type, int version, int seq, string payload)
        {
            Type = type;
            Version = version;
            Seq = seq;
            Payload = payload;
        }
    }

    /// <summary>
    /// 极小的 JSON 读取器：只做"从信封里取出顶层字段"这件事。
    ///
    /// 为什么不用 Newtonsoft：本项目尚未引入该包，而信封只需要 4 个顶层字段。
    /// 为什么不用 <see cref="UnityEngine.JsonUtility"/> 直接反序列化信封：
    ///   <c>payload</c> 是**任意形状**的子对象，JsonUtility 无法把它保留成字符串。
    /// 因此这里手写一个扫描器：**只走顶层**，遇到 <c>{}/[]</c> 做括号配平，字符串内部不误判。
    /// 纪律：解析失败一律返回 null/false，**不抛异常**（一条脏消息不该影响场景）。
    /// </summary>
    public static class BridgeJson
    {
        private static int SkipWhitespace(string s, int i)
        {
            while (i < s.Length && char.IsWhiteSpace(s[i])) i++;
            return i;
        }

        /// <summary>读一个字符串字面量（<c>s[i] == '"'</c>），返回其结束后的下标。</summary>
        private static int ReadStringBody(string s, int i, out string value)
        {
            var sb = new StringBuilder();
            i++; // 跳过开引号
            while (i < s.Length)
            {
                char c = s[i];
                if (c == '\\')
                {
                    i++;
                    if (i >= s.Length) break;
                    char e = s[i];
                    switch (e)
                    {
                        case 'n': sb.Append('\n'); break;
                        case 't': sb.Append('\t'); break;
                        case 'r': sb.Append('\r'); break;
                        case 'b': sb.Append('\b'); break;
                        case 'f': sb.Append('\f'); break;
                        case 'u':
                            if (i + 4 < s.Length &&
                                int.TryParse(s.Substring(i + 1, 4), System.Globalization.NumberStyles.HexNumber,
                                    System.Globalization.CultureInfo.InvariantCulture, out int code))
                            {
                                sb.Append((char)code);
                                i += 4;
                            }
                            break;
                        default: sb.Append(e); break;
                    }
                    i++;
                }
                else if (c == '"')
                {
                    i++;
                    value = sb.ToString();
                    return i;
                }
                else
                {
                    sb.Append(c);
                    i++;
                }
            }
            value = sb.ToString();
            return i;
        }

        /// <summary>跳过一个 JSON 值，返回值之后的下标。</summary>
        private static int SkipValue(string s, int i)
        {
            i = SkipWhitespace(s, i);
            if (i >= s.Length) return i;

            char c = s[i];
            if (c == '"') return ReadStringBody(s, i, out _);

            if (c == '{' || c == '[')
            {
                char close = c == '{' ? '}' : ']';
                int depth = 0;
                while (i < s.Length)
                {
                    char d = s[i];
                    if (d == '"')
                    {
                        i = ReadStringBody(s, i, out _);
                        continue;
                    }
                    if (d == c) depth++;
                    else if (d == close)
                    {
                        depth--;
                        if (depth == 0) return i + 1;
                    }
                    i++;
                }
                return i;
            }

            while (i < s.Length && s[i] != ',' && s[i] != '}') i++;
            return i;
        }

        /// <summary>取顶层字段的**原始 JSON 片段**；找不到返回 null。</summary>
        public static string GetRaw(string json, string key)
        {
            if (string.IsNullOrEmpty(json)) return null;

            int i = SkipWhitespace(json, 0);
            if (i >= json.Length || json[i] != '{') return null;
            i++;

            while (true)
            {
                i = SkipWhitespace(json, i);
                if (i >= json.Length || json[i] == '}') return null;
                if (json[i] != '"') return null;

                i = ReadStringBody(json, i, out string name);
                i = SkipWhitespace(json, i);
                if (i >= json.Length || json[i] != ':') return null;
                i++;

                int start = SkipWhitespace(json, i);
                int end = SkipValue(json, start);
                if (end < start) return null;

                if (name == key) return json.Substring(start, end - start);

                i = SkipWhitespace(json, end);
                if (i < json.Length && json[i] == ',') i++;
            }
        }

        /// <summary>取顶层字符串字段；不存在或形状不对返回 <paramref name="fallback"/>。</summary>
        public static string GetString(string json, string key, string fallback = null)
        {
            string raw = GetRaw(json, key);
            if (string.IsNullOrEmpty(raw) || raw[0] != '"') return fallback;
            ReadStringBody(raw, 0, out string value);
            return value;
        }

        /// <summary>取顶层数字字段（整数）。</summary>
        public static int GetInt(string json, string key, int fallback = 0)
        {
            string raw = GetRaw(json, key);
            if (string.IsNullOrEmpty(raw)) return fallback;
            return double.TryParse(raw, System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture, out double value)
                ? (int)value
                : fallback;
        }

        /// <summary>解析信封；<paramref name="json"/> 不是合法信封时返回 false（调用方只告警）。</summary>
        public static bool TryParseEnvelope(string json, out BridgeEnvelope envelope)
        {
            envelope = default;
            string type = GetString(json, "type");
            if (string.IsNullOrEmpty(type)) return false;

            int version = GetInt(json, "version", -1);
            int seq = GetInt(json, "seq", 0);
            string payload = GetRaw(json, "payload");
            envelope = new BridgeEnvelope(type, version, seq, payload);
            return true;
        }

        /// <summary>把 payload 片段反序列化成指定类型；空/`null` 时返回 <c>default</c>。</summary>
        public static T ParsePayload<T>(string payload) where T : class
        {
            if (string.IsNullOrEmpty(payload) || payload == "null") return null;
            try
            {
                return UnityEngine.JsonUtility.FromJson<T>(payload);
            }
            catch (Exception)
            {
                return null;
            }
        }
    }
}
