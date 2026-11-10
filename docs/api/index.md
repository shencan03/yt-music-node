# API overview

Every method of `YTMusic`, by area. All of them are async and accept a `signal` in their options. Each entry in the area pages shows the signature, its options, what it returns with real example output, its errors, whether it needs auth, and which test suites cover it.

**Legend:** 🔓 works signed out · 👤 more data when signed in · 🔐 auth required · ✏️ changes your account

## [Search](/api/search)

| Method | | |
|---|---|---|
| [`search(query, options?)`](/api/search#search) | 👤 | search the catalog, your library or uploads |
| [`getSearchSuggestions(query, options?)`](/api/search#getsearchsuggestions) | 👤 | suggestions while typing |
| [`removeSearchSuggestions(suggestions, options?)`](/api/search#removesearchsuggestions) | 🔐 ✏️ | remove search history entries |

## [Browsing](/api/browsing)

| Method | | |
|---|---|---|
| [`getHome(options?)`](/api/browsing#gethome) | 👤 | the home page shelves |
| [`getArtist(channelId)`](/api/browsing#getartist) | 👤 | an artist page |
| [`getArtistAlbums(channelId, params, options?)`](/api/browsing#getartistalbums) | 🔓 | all albums or singles of an artist |
| [`getUser(channelId)`](/api/browsing#getuser) | 🔓 | a user's page |
| [`getUserPlaylists(channelId, params)`](/api/browsing#getuserplaylists) | 🔓 | all playlists of a user |
| [`getUserVideos(channelId, params)`](/api/browsing#getuservideos) | 🔓 | all videos of a user |
| [`getAlbum(browseId)`](/api/browsing#getalbum) | 👤 | an album and its tracks |
| [`getAlbumBrowseId(audioPlaylistId)`](/api/browsing#getalbumbrowseid) | 🔓 | `OLAK5uy_…` → `MPREb_…` |
| [`getSong(videoId, options?)`](/api/browsing#getsong) | 🔓 | player data for a song |
| [`getSongRelated(browseId)`](/api/browsing#getsongrelated) | 🔓 | related content for a song |
| [`getSongCredits(browseId)`](/api/browsing#getsongcredits) | 🔓 | performers, writers, producers |
| [`getLyrics(browseId, options?)`](/api/browsing#getlyrics) | 🔓 | lyrics, optionally timed |
| [`getBasejsUrl()`](/api/browsing#getbasejsurl) | 🔓 | the player script URL |
| [`getSignatureTimestamp(options?)`](/api/browsing#getsignaturetimestamp) | 🔓 | the player's signature timestamp |
| [`getTasteProfile()`](/api/browsing#gettasteprofile) | 🔐 | artists in the taste profile |
| [`setTasteProfile(artists, options?)`](/api/browsing#settasteprofile) | 🔐 ✏️ | select artists in the taste profile |

## [Watch playlists](/api/watch)

| Method | | |
|---|---|---|
| [`getWatchPlaylist(options)`](/api/watch#getwatchplaylist) | 👤 | the "Up next" queue, radios, shuffles |

## [Explore & charts](/api/explore)

| Method | | |
|---|---|---|
| [`getExplore()`](/api/explore#getexplore) | 🔓 | new releases, trending, moods |
| [`getMoodCategories()`](/api/explore#getmoodcategories) | 🔓 | moods and genres |
| [`getMoodPlaylists(params)`](/api/explore#getmoodplaylists) | 🔓 | playlists of a mood or genre |
| [`getCharts(options?)`](/api/explore#getcharts) | 🔓 | charts by country |

## [Podcasts](/api/podcasts)

| Method | | |
|---|---|---|
| [`getChannel(channelId)`](/api/podcasts#getchannel) | 🔓 | a podcast channel |
| [`getChannelEpisodes(channelId, params)`](/api/podcasts#getchannelepisodes) | 🔓 | all episodes of a channel |
| [`getPodcast(playlistId, options?)`](/api/podcasts#getpodcast) | 👤 | a podcast and its episodes |
| [`getEpisode(videoId)`](/api/podcasts#getepisode) | 👤 | one episode |
| [`getEpisodesPlaylist(playlistId?)`](/api/podcasts#getepisodesplaylist) | 🔐 | new episodes / episodes for later |

## [Playlists](/api/playlists)

| Method | | |
|---|---|---|
| [`getPlaylist(playlistId, options?)`](/api/playlists#getplaylist) | 👤 | a playlist and its tracks |
| [`getLikedSongs(options?)`](/api/playlists#getlikedsongs) | 🔐 | your liked songs |
| [`getSavedEpisodes(options?)`](/api/playlists#getsavedepisodes) | 🔐 | your episodes for later |
| [`createPlaylist(title, description, options?)`](/api/playlists#createplaylist) | 🔐 ✏️ | create a playlist |
| [`editPlaylist(playlistId, options)`](/api/playlists#editplaylist) | 🔐 ✏️ | rename, reorder, privacy, collaboration |
| [`deletePlaylist(playlistId)`](/api/playlists#deleteplaylist) | 🔐 ✏️ | delete a playlist |
| [`addPlaylistItems(playlistId, options)`](/api/playlists#addplaylistitems) | 🔐 ✏️ | add songs or a whole playlist |
| [`removePlaylistItems(playlistId, videos)`](/api/playlists#removeplaylistitems) | 🔐 ✏️ | remove items |
| [`joinCollaborativePlaylist(playlistId, token)`](/api/playlists#joincollaborativeplaylist) | 🔐 ✏️ | join with an invite token |

## [Library & account](/api/library)

| Method | | |
|---|---|---|
| [`getLibraryPlaylists(options?)`](/api/library#getlibraryplaylists) | 🔐 | playlists in your library |
| [`getLibrarySongs(options?)`](/api/library#getlibrarysongs) | 🔐 | songs in your library |
| [`getLibraryAlbums(options?)`](/api/library#getlibraryalbums) | 🔐 | albums in your library |
| [`getLibraryArtists(options?)`](/api/library#getlibraryartists) | 🔐 | artists in your library |
| [`getLibrarySubscriptions(options?)`](/api/library#getlibrarysubscriptions) | 🔐 | artists you subscribe to |
| [`getLibraryPodcasts(options?)`](/api/library#getlibrarypodcasts) | 🔐 | podcasts in your library |
| [`getLibraryChannels(options?)`](/api/library#getlibrarychannels) | 🔐 | podcast channels you subscribe to |
| [`rateSong(videoId, rating?)`](/api/library#ratesong) | 🔐 ✏️ | like, dislike, unrate |
| [`ratePlaylist(playlistId, rating?)`](/api/library#rateplaylist) | 🔐 ✏️ | save or unsave a playlist or album |
| [`editSongLibraryStatus(feedbackTokens)`](/api/library#editsonglibrarystatus) | 🔐 ✏️ | add or remove songs from the library |
| [`subscribeArtist(channelId)`](/api/library#subscribeartist) | 🔐 ✏️ | subscribe |
| [`unsubscribeArtists(channelIds)`](/api/library#unsubscribeartists) | 🔐 ✏️ | unsubscribe |
| [`getHistory()`](/api/library#gethistory) | 🔐 | your play history |
| [`addHistoryItem(song)`](/api/library#addhistoryitem) | 🔐 ✏️ | record a play |
| [`removeHistoryItems(feedbackTokens)`](/api/library#removehistoryitems) | 🔐 ✏️ | remove history entries |
| [`getAccountInfo()`](/api/library#getaccountinfo) | 🔐 | name, handle, photo |

## [Uploads](/api/uploads)

| Method | | |
|---|---|---|
| [`uploadSong(source, options?)`](/api/uploads#uploadsong) | 🔐 ✏️ | upload an audio file |
| [`getLibraryUploadSongs(options?)`](/api/uploads#getlibraryuploadsongs) | 🔐 | your uploaded songs |
| [`getLibraryUploadAlbums(options?)`](/api/uploads#getlibraryuploadalbums) | 🔐 | albums of your uploads |
| [`getLibraryUploadArtists(options?)`](/api/uploads#getlibraryuploadartists) | 🔐 | artists of your uploads |
| [`getLibraryUploadArtist(browseId, options?)`](/api/uploads#getlibraryuploadartist) | 🔐 | uploads by one artist |
| [`getLibraryUploadAlbum(browseId)`](/api/uploads#getlibraryuploadalbum) | 🔐 | one upload album |
| [`deleteUploadEntity(entityId)`](/api/uploads#deleteuploadentity) | 🔐 ✏️ | delete an upload |

## [Raw requests](/api/raw)

| Method | | |
|---|---|---|
| [`request(endpoint, body?, options?)`](/api/raw#request) | 👤 | any InnerTube endpoint |
| [`YTMusic.fromAuthFile(path, options?)`](/guide/configuration#ytmusic-fromauthfile) | | create a signed-in client from a file |

The [coverage matrix](/api/coverage) shows which tests call each method, and the [type reference](/reference/) documents every option and result type.
