import express from "express"
console.log("===== Welcome to the Paint Calculator! =====");

const app = express()
app.use(express.json());

class Paint{
    #id;
    #color;
    #vendor;
    #finish;
    #coverage;
    #price;

    constructor(id, c, ven, fin, cov, p){
        this.#id = id;
        this.#color = c;
        this.#vendor = ven;
        this.#finish = fin;
        this.#coverage = cov; //area covered per liter
        this.#price = p; //price per liter
    }

    getID(){
        return this.#id;
    }

    getColor(){
        return this.#color;
    }

    getVendor(){
        return this.#vendor;
    }

    getColor(){
        return this.#color;
    }

    getFinish(){
        return this.#finish;
    }

    getCoverage(){
        return this.#coverage;
    }

    getPrice(){
        return this.#price;
    }
}

class Wall{
    #width
    #height
    #coats
    #protusionArea //area that increases wall area (ex: ceiling, additional surface, etc)
    #objectsArea //area not to be painted (door, window, etc)

    constructor(w, h, c, p, o){
        this.#width = w;
        this.#height = h;
        this.#coats = c;
        this.#protusionArea = p;
        this.#objectsArea = o;
    }

    getRawArea(){
        return this.#width * this.#height;
    }

    getAdjustedArea(){
        return this.getRawArea() + this.#protusionArea - this.#objectsArea;
    }

    getFinalArea(){
        return this.getAdjustedArea() * this.#coats;
    }

}


class paintCalculator{
    constructor(selectedPaint, wallArray) {
        this.selectedPaint = selectedPaint;
        this.wallArray = wallArray;
    }
    calculateTotalArea() {
        let total = 0;
        for (let i = 0; i< this.wallArray.length; i++) {
            const wall = this.wallArray[i];
            total += wall.getFinalArea();
        }
        return total;
    }
    calculateResult(){
        const totalArea = this.calculateTotalArea();
        const litersRequired = totalArea / this.selectedPaint.getCoverage();
        const totalCost = litersRequired * this.selectedPaint.getPrice();
        return {
            totalArea,
            litersRequired,
            totalCost
        };
    }
}

async function getPaintList(){
    const url = "https://my.api.mockaroo.com/paints"
    const headers = {"X-API-Key": "f72e3020"};
    const res = await fetch(url, { headers });
    const data = await res.json();

    return data;
}

app.get("/paint/:id", async (req, res) => {
    const paints = await getPaintList();

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        res.status(400)
        res.json({
            error: "ID must be an integer"
        });
        return;
    }

    const paint = paints.find(p => p.id === id)
    if (paint === undefined) {
        res.status(404)
        res.json({
            error: "Couldn't find a paint with that ID"
        })
        return;
    }
    res.json(paint)
})

app.post("/calculator", async (req, res) => {
    
    const {paintID, walls} = req.body;
    if (!paintID || !walls || !Array.isArray(walls) || walls.length === 0){
        res.status(400);
        res.json({
            error: "Request must include a paintID and an array of Walls!"
        })
        return;
    }

    const paints = await getPaintList();
    const selectedPaint = paints.find(p => p.id === paintID);
    if (!selectedPaint) {
        res.status(400);
        res.json({
            error: "There is no paint with that ID!"
        })
        return;
    }

    const paint = new Paint(
        selectedPaint.id,
        selectedPaint.color,
        selectedPaint.brand,
        selectedPaint.finish,
        selectedPaint.coverage,
        selectedPaint.costPerLitre
    );

    let wallList = [];
    let i = 0;
    do {
        const w = walls[i];
        const width = parseFloat(w.width);
        const height = parseFloat(w.height);
        const coats = parseInt(w.coats);

        if (isNaN(width) || isNaN(height) || isNaN(coats) || height <= 0 || width <= 0 || coats < 1){
            i++;
            res.status(400);
            res.json({
                error: `Invalid Input for Wall ${i}'s Dimensions or Coats!`
            })
            return;
        }

        const rawArea = width * height;

        let protusionArea = 0;
        if (w.protusion) {
            if (!Array.isArray(w.protusion)) {
                i++;
                res.status(400);
                res.json({
                    error: `Protusiosn for Wall ${i} must be an Array`
                })
                return;
            }

            for (const prot of w.protusion) {
                const pWidth = parseFloat(prot.width);
                const pHeight = parseFloat(prot.height);

                if (isNaN(pWidth) || isNaN(pHeight) || pWidth <= 0 || pHeight <= 0){
                    i++;
                    res.status(400);
                    res.json({
                        error: `Invalid Protusion dimensions for Wall ${i}`
                    })
                    return;
                }
                protusionArea += pWidth * pHeight;
            }

            if (protusionArea >= rawArea){
                i++;
                res.status(400);
                res.json({
                    error: `The Protusion area for Wall ${i} must be less than the wall's area of: ${rawArea}`
                })
                return;
            }
        }

        let objectsArea = 0;
        if (w.objects) {
            if (!Array.isArray(w.objects)) {
                i++;
                res.status(400);
                res.json({
                    error: `Objects for Wall ${i} must be an Array`
                })
                return;
            }

            for (const obj of w.objects) {
                if (!Array.isArray(w.objects)) {
                    i++;
                    res.status(400);
                    res.json({
                        error: `The Objects for Wall ${i} must be an array`
                    })
                    return;
                }

                for (const obj of w.objects) {
                    const oWidth = parseFloat(obj.width);
                    const oHeight = parseFloat(obj.height);

                    if (isNaN(oWidth) || isNaN(oHeight) || oWidth <= 0 || oHeight <= 0){
                        i++;
                        res.status(400);
                        res.json({
                            error: `THe object dimensions for Wall ${i} are invalid`
                        })
                        return;
                    }
                    objectsArea += oWidth * oHeight;
                }

                if (objectsArea >= rawArea) {
                    i++;
                    res.status(400);
                    res.json({
                        error: `The total objects are for Wall ${i} must be less than the Walls area of: ${rawArea} `
                    })
                    return;
                }
            }
        }

        wallList.push(new Wall(width, height, coats, protusionArea, objectsArea));
        i++;
    } while (i < walls.length);

    const calculator = new paintCalculator(paint, wallList);
    const {totalArea , litersRequired, totalCost} =  calculator.calculateResult();

    return res.json({
        selectedPaint: {
            id: (paint.getID()),
            color: (paint.getColor()),
            vendor: (paint.getVendor()),
            finish: (paint.getFinish()),
            coverage: (paint.getCoverage() + " m^2"),
            costPerLiter: ("£ " + paint.getPrice())
        },

        totalWalls: (wallList.length),
        totalArea: (totalArea.toFixed(2) + " m^2"),
        litersRequired: (litersRequired.toFixed(2) + " L"),
        totalCost: ("£ " + totalCost.toFixed(2))
    })
})

app.listen(8080, () => {
    console.log("Paint Calculator started at http://localhost:8080");
})
