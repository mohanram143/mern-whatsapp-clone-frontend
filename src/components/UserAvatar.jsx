import { fileUrl } from "../config";

export default function UserAvatar({
  username = "",
  avatar = "",
  online = false,
  size = "md",
  className = "",
  onClick,
}) {
  const colors = [
    "from-green-400 to-emerald-600",
    "from-blue-400 to-blue-600",
    "from-purple-400 to-purple-600",
    "from-orange-400 to-orange-600",
    "from-pink-400 to-pink-600",
    "from-teal-400 to-teal-600",
    "from-red-400 to-red-600",
    "from-yellow-400 to-yellow-600",
  ];
  const color = colors[(username.charCodeAt(0) || 0) % colors.length];

  const sizes = {
    sm: "w-9 h-9 text-sm",
    md: "w-11 h-11 text-base",
    lg: "w-14 h-14 text-xl",
    xl: "w-16 h-16 text-2xl",
    xxl: "w-32 h-32 text-4xl",
  };

  const dotSizes = {
    sm: "w-2.5 h-2.5 border-[1.5px]",
    md: "w-3 h-3 border-2",
    lg: "w-3.5 h-3.5 border-2",
    xl: "w-4 h-4 border-2",
    xxl: "w-5 h-5 border-2",
  };

  return (
    <div
      className={`relative flex-shrink-0 ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
    >
      {avatar ? (
        <img
          src={fileUrl(avatar)}
          alt={username}
          className={`${sizes[size]} rounded-full object-cover shadow-sm`}
        />
      ) : (
        <div
          className={`${sizes[size]} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white uppercase shadow-sm`}
        >
          {username[0] || "?"}
        </div>
      )}
      {online && (
        <span
          className={`absolute bottom-0 right-0 ${dotSizes[size]} bg-green-400 rounded-full border-gray-900 dark:border-gray-900 border-gray-100`}
        />
      )}
    </div>
  );
}
