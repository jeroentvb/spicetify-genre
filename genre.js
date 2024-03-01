// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./globals.d.ts" />

(async function genre() {
   while (!Spicetify?.Player || !Spicetify?.CosmosAsync) {
      await new Promise(resolve => setTimeout(resolve, 100));
   }

   /**
	* Fetch genre from artist
	* @param artistURI {string}
	* @return {Promise<Array>}
	*/
   async function fetchGenresForArtist(artistURI) {
      const res = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/artists/${artistURI}`);
      return res.genres.slice(0, 3); // Only keep the first 3 genres
   }

   /**
	* Fetch playlist from The Sound of Spotify for a given genre
	* @param {string} genre
	* @return {Promise<string|null>}
	*/
   async function fetchSoundOfSpotifyPlaylist(genre) {
      const query = encodeURIComponent(`The Sound of ${genre}`);
      // Check localStorage for playlist
      const cached = localStorage.getItem(`everynoise:${query}`);
      if (cached !== null) {
         return cached;
      }

      // Search for playlist and check results for the everynoise account
      const re = new RegExp(`^the sound of ${genre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      /** @type { {playlists: { items: any[] } } } */
      const res = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/search?q=${query}&type=playlist`);
      const playlist = res.playlists.items.find(item => item.owner.id === 'thesoundsofspotify' && re.test(item.name));

      if (playlist) {
         localStorage.setItem(`everynoise:${genre}`, playlist.uri);
         return playlist.uri;
      }

      return null;
   }

   function clearGenreContainer(showLoading = false) {
      while (genreContainer.firstChild) {
         genreContainer.removeChild(genreContainer.lastChild);
      }

      if (showLoading) {
         const loadingText = document.createElement('span');
         loadingText.textContent = 'Loading genres..';
         genreContainer.appendChild(loadingText);
      }
   }

   const infoContainer = document.querySelector('div.main-trackInfo-container');
   const genreContainer = document.createElement('div');
   genreContainer.classList.add('main-trackInfo-genres', 'ellipsis-one-line', 'main-type-finale');
   infoContainer.appendChild(genreContainer);

   Spicetify.Player.addEventListener('songchange', async () => {
      // If the current track somehow doesn't have an artist uri, clear the genresContainer and do nothing.
      if (!Object.hasOwn(Spicetify.Player.data?.item.metadata, 'artist_uri')) {
         clearGenreContainer();
         return;
      }

      // Show loading text
      clearGenreContainer(true);

      const artistId = Spicetify.Player.data.item.metadata.artist_uri.split(':')[2];
      const genres = await fetchGenresForArtist(artistId);
      const genreElements = await Promise.all(genres.map(async (genre) => {
         const uri = await fetchSoundOfSpotifyPlaylist(genre);
         const element = document.createElement(uri ? 'a' : 'span');
         if (uri) element.href = uri;

         element.textContent = genre;
         element.classList.add('genre-link');

         return element;
      }));

      // Remove loading text
      clearGenreContainer();

      // Render genre elements
      genreElements.forEach((element, i) => {
         genreContainer.appendChild(element);

         if (i < genres.length - 1) {
            const separator = document.createElement('span');
            separator.textContent = ', ';
            genreContainer.appendChild(separator);
         }
      });
   });

   /**
	 * Add styling for genreContainer
	 */
   const style = document.createElement('style');
   style.textContent = `
	 .main-trackInfo-container {
		grid-template-areas: "pretitle pretitle"
		"title title"
		"badges subtitle"
		"genre genre" !important
	 }
 
	 .main-trackInfo-genres {
		color: var(--spice-extratext);
		grid-area: genre;
	 }
 
	  .genre-link {
		font-size: 11px;
		text-transform: capitalize;
	  }
	`;

   document.body.appendChild(style);
})();
