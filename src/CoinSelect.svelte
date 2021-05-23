<script>
  let coinList = [
    { id: 1, text: "bitcoin" },
    { id: 2, text: "cardano" },
    { id: 3, text: "ark" },
  ];

  export let selected;

  function handleAddCoin() {
    console.log(selected.text);
  }
  
</script>

<select bind:value={selected}>
  {#each coinList as coin}
    <option value={coin}>{coin.text}</option>
  {/each}
</select>

<button on:click={handleAddCoin}>add coin</button>
