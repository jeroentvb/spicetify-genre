// <reference path="./globals.d.ts" />

(function Genre() {
   const { CosmosAsync, Player } = Spicetify;
 
   /**
    * Fetch genre from artist
    *
    * @param artistURI {string}
    * @return {Promise<Array>}
    */
   const fetchGenres = async (artistURI) => {
     const res = await CosmosAsync.get(
       `https://api.spotify.com/v1/artists/${artistURI}`
     );
     // noinspection JSUnresolvedVariable
     return res.genres.slice(0, 3) // Only keep the first 3 genres
   };
 
   /**
    * Fetch playlist from The Sound of Spotify for a given genre
    * @param {String} genre
    * @return {String|null}
    */
   const fetchSoundOfSpotifyPlaylist = async (genre) => {
     const query = encodeURIComponent(`The Sound of ${genre}`);
     // Check localStorage for playlist
     const cached = localStorage.getItem(`everynoise:${query}`);
     if (cached !== null) {
       return cached; 
     }
 
     // Search for playlist and check results for the everynoise account
     const re = new RegExp(`^the sound of ${genre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
     const res = await CosmosAsync.get(`https://api.spotify.com/v1/search?q=${query}&type=playlist`)
     for (const item of res.playlists.items) {
       if (item.owner.id === "thesoundsofspotify" && re.test(item.name)) {
         localStorage.setItem(`everynoise:${genre}`, item.uri);
         return item.uri
       }
     }
     return null;
   };
 
 
   // Store the current playback id
   let playback = null;
 
   /**
    *
    * @type {Node}
    */
   let genreContainer = null;
 
   let infoContainer = document.querySelector('div.main-trackInfo-container');
 
   /**
    * Remove genre injection in the UI
    */
   const cleanInjection = () => {
     if (genreContainer !== null) {
       try {
         infoContainer.removeChild(genreContainer);
       } catch (e) {}
     }
   };
 
   /**
    * Inject genres to UI
    */
   const inject = () => {
     Player.addEventListener('songchange', async () => {
       if (Player.data?.item.metadata.hasOwnProperty('artist_uri')) {
         // If the registered song isn't the same as the one currently being played then fetch genres
         if (playback !== Player.data.playbackId) {
           // Save the new track
           playback = Player.data.playbackId;
           const id = Player.data.item.metadata.artist_uri.split(':')[2];
           const genres = await fetchGenres(id);
 
           cleanInjection();
 
           genreContainer = document.createElement('div');
           // noinspection JSUndefinedPropertyAssignment
           genreContainer.className = 'main-trackInfo-genres ellipsis-one-line main-type-finale';
           // noinspection JSUnresolvedVariable
           genreContainer.style.color = 'var(--spice-extratext)';
           genreContainer.style.gridArea = 'genre';
 
           for (const i in genres) {
             let element;
             const uri = await fetchSoundOfSpotifyPlaylist(genres[i]);
             if (uri !== null) {
               element = document.createElement('a');
               element.innerHTML = genres[i];
               element.href = uri;
             } else {
               element = document.createElement('span');
             }
             element.innerHTML = genres[i];
             element.style.fontSize ="11px";
             element.style.textTransform = "capitalize";
             genreContainer.appendChild(element);
             if (i < genres.length-1) {
               const separator = document.createElement('span');
               separator.innerHTML = ', ';
               genreContainer.appendChild(separator);
             }
           }
 
           infoContainer = document.querySelector('div.main-trackInfo-container');
           infoContainer.style.gridTemplateAreas = `
           "pretitle pretitle"
           "title title"
           "badges subtitle"
           "genre genre"`;
           if(!infoContainer) cleanInjection();
           infoContainer.appendChild(genreContainer);
 
         }
       } else {
         cleanInjection();
       }
     });
   };
 
   if (!CosmosAsync) {
     setTimeout(Genre, 500);
   } else {
     inject();
   }
 })();
