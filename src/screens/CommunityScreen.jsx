import { useState } from "react";
import BottomNav from "../components/BottomNav";
import { communityPosts as posts } from "../data/communityPosts";

const tabs = [
  { id: "featured", label: "Featured" },
  { id: "latest", label: "Latest" },
  { id: "following", label: "Following" },
];

export default function CommunityScreen({ navigate, activeProfile }) {
  const [tab, setTab] = useState("featured");
  const [liked, setLiked] = useState({});

  const toggleLike = (id, e) => {
    e.stopPropagation();
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="h-full flex flex-col bg-primary-800">
      {/* Header */}
      <div className="px-5 pt-8 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary-100">
            Community Works
          </h2>
          <button className="w-9 h-9 bg-primary-700 rounded-full border border-primary-600 flex items-center justify-center text-base shadow-sm">
            🔍
          </button>
        </div>

        {/* Tabs — primary-900 pill track, active tab is primary-100 card */}
        <div className="flex gap-1 bg-primary-900 rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${
                tab === t.id
                  ? "bg-primary-100 text-primary-900 shadow-sm"
                  : "text-primary-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {tab === "following" ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <span className="text-5xl mb-3">🌱</span>
            <p className="text-primary-300 text-sm font-medium">
              No users followed yet
            </p>
            <p className="text-primary-500 text-xs mt-1">
              Go to Featured to discover works you like
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-1">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-primary-100 rounded-2xl overflow-hidden border border-primary-200 active:scale-[0.97] transition-transform cursor-pointer"
              >
                {/* Image — gradient backgrounds stay warm/colourful as community content */}
                <div
                  className={`h-36 relative overflow-hidden ${!post.image ? `bg-gradient-to-br ${post.bg} flex items-center justify-center` : ""}`}
                >
                  {post.image ? (
                    <img
                      src={post.image}
                      alt={post.item}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-5xl">{post.emoji}</span>
                  )}
                  <div className="absolute top-2 right-2 bg-primary-900/60 backdrop-blur-sm rounded-full px-2 py-0.5">
                    <span className="text-[10px] text-primary-200 font-medium">
                      #{post.tag}
                    </span>
                  </div>
                </div>
                {/* Info */}
                <div className="p-3">
                  <p className="font-semibold text-primary-900 text-xs truncate mb-1.5">
                    {post.item}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{post.avatar}</span>
                      <span className="text-[11px] text-primary-500">
                        {post.user}
                      </span>
                    </div>
                    <button
                      onClick={(e) => toggleLike(post.id, e)}
                      className="flex items-center gap-1"
                    >
                      <span className="text-sm">
                        {liked[post.id] ? "❤️" : "🤍"}
                      </span>
                      <span className="text-[11px] text-primary-500">
                        {post.likes + (liked[post.id] ? 1 : 0)}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav
        current="community"
        navigate={navigate}
        activeProfile={activeProfile}
      />
    </div>
  );
}
