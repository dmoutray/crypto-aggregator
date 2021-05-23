<script>
  import CoinSelect from "./CoinSelect.svelte";
  import Header from "./Header.svelte";

  let currencies = ["gbp", "usd"];
  let coinList = ["bitcoin", "cardano", "ark", "dogecoin"];
  let coinInformation;

  let savedInfo = localStorage.getItem("coinInformation");

  if (savedInfo) {
    coinInformation = JSON.parse(savedInfo);
  } else {
    coinInformation = [
      {
        symbol: "bitcoin",
        amount: 0.0,
        purchasePrice: 0.0,
        currentMarketPrice: {
          gbp: 0.0,
          usd: 0.0,
        },
      },
      {
        symbol: "cardano",
        amount: 0.0,
        purchasePrice: 0.0,
        currentMarketPrice: {
          gbp: 0.0,
          usd: 0.0,
        },
      },
    ];
  }

  let newCoin = coinList[0];

  function getMarketData() {
    return fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinInformation
        .map((coin) => coin.symbol)
        .join("%2C")}&vs_currencies=${currencies.join("%2C")}`
    )
      .then((response) => response.json())
      .then((result) => {
        let newInfo = coinInformation.map((coin) => {
          coin.currentMarketPrice["gbp"] = parseFloat(
            result[coin.symbol]["gbp"]
          );
          coin.currentMarketPrice["usd"] = parseFloat(
            result[coin.symbol]["usd"]
          );

          return coin;
        });

        coinInformation = [...newInfo];
        localStorage.setItem('coinInformation', JSON.stringify(coinInformation))
        return result;
      });
  }

  function handleAddCoin() {
    coinInformation = [
      ...coinInformation,
      {
        symbol: newCoin,
        amount: 0.0,
        purchasePrice: 0.0,
        currentMarketPrice: {
          gbp: 0.0,
          usd: 0.0,
        },
      },
    ];
    getMarketData();
  }

  $: currentInvestmentValue = coinInformation
    .reduce(function (total, coin) {
      return coin.currentMarketPrice !== 0
        ? total +
            coin.amount * (coin.purchasePrice / coin.currentMarketPrice.gbp)
        : 0;
    }, 0)
    .toFixed(2);

  $: totalInvested = coinInformation.reduce((total, coin) => {
    return total + coin.amount;
  }, 0);

  // Do the initial fetch of the data on page load.
  getMarketData();

  setInterval(getMarketData, 10000);
</script>

<div class="container">
  <div>
    <Header {totalInvested} {currentInvestmentValue} />
  </div>

  {#each coinInformation as coin}
    <div>
      <div>
        <span class="form-coin-name">{coin.symbol}</span>
        <input type="number" bind:value={coin.amount} />
        <input type="number" bind:value={coin.purchasePrice} />
      </div>
    </div>
  {/each}

  <div>
    <div>
      <select bind:value={newCoin}>
        {#each coinList as coin}
          <option value={coin}>{coin}</option>
        {/each}
      </select>
      <button on:click={handleAddCoin}>add coin</button>
    </div>
  </div>

  <div>
    <h2>Current Market Price</h2>
    <table>
      <thead>
        <tr>
          <th>coin</th>
          <th>£ gbp</th>
          <th>$ usd</th>
        </tr>
      </thead>
      {#each coinInformation as coinInfo}
        <tr>
          <th>{coinInfo.symbol}</th>
          <td>{coinInfo.currentMarketPrice.gbp}</td>
          <td>{coinInfo.currentMarketPrice.usd}</td>
        </tr>
      {/each}
    </table>
  </div>
</div>

<style>

  
</style>
