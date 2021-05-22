<script>
  let coin1 = "bitcoin";
  let coin1PurchasePrice = 0;
  let coin1Amount = 0;
  let coin2 = "cardano";
  let coin2PurchasePrice = 0;
  let coin2Amount = 0;

  let currency1 = "gbp";
  let currency2 = "usd";

  $: currentInvestmentValue = 0;

  $: data = fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${
      coin1 + "%2C" + coin2
    }&vs_currencies=${currency1 + "%2C" + currency2}`
  )
    .then((response) => response.json())
    .then((result) => {
      currentInvestmentValue = (
        coin1Amount * (coin1PurchasePrice / result.bitcoin?.gbp) +
        coin1Amount * (coin2PurchasePrice / result.cardano?.gbp) 
	  ).toFixed(2);
      return result;
    });

  $: totalInvested = coin1Amount + coin2Amount;
</script>

<main>
  <h1>Investment Aggre-gator 🐊</h1>
  <h2>Total Invested: {totalInvested}</h2>
  <h2>Current investment value: {currentInvestmentValue}</h2>

  <label>
    coin 1
    <input type="text" bind:value={coin1} />
    <input type="number" bind:value={coin1Amount} />
    <input type="number" bind:value={coin1PurchasePrice} />
  </label>

  <label>
    coin 2
    <input type="text" bind:value={coin2} />
    <input type="number" bind:value={coin2Amount} />
    <input type="number" bind:value={coin2PurchasePrice} />
  </label>

  {#await data then value}
    <table>
      <th>coin</th>
      <th>£ gbp</th>
      <th>$ usd</th>
      {#each Object.keys(value) as key}
        <tr>
          {key}
          <td>{value[key][currency1]}</td>
          <td>${value[key][currency2]}</td>
        </tr>
      {/each}
    </table>
  {/await}
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    font-size: 4em;
    font-weight: 100;
  }

  table {
    margin: 20px auto;
  }

  td {
    width: 150px;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>
