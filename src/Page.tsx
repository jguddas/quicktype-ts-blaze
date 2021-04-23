type PageProps = {
  input: string
  output: string
  onChangeInput: (str: string) => void
  onChangeOutput: (str: string) => void
}

function Page({ input, output, onChangeInput, onChangeOutput }:PageProps) {
  return (
    <div className="wrapper">
        <div className="page-wrapper">
          <div className="page-body">
            <div className="container-xl mb-3">
              <div className="page-header d-print-none">
                <h2 className="page-title">
                  quicktype ts-blaze
                </h2>
              </div>
            </div>
            <div className="container-xl">
              <div className="card">
                <div className="row">
                  <div
                    className="col-6"
                    style={{
                      paddingRight: 0,
                      borderRight: '1px solid rgba(101, 109, 119, 0.16)'
                    }}
                  >
                    <div className="card-header">
                      <h3 className="card-title">
                        Input
                      </h3>
                    </div>
                    <div className="card-body">
                      <textarea
                        value={input}
                        className="form-control"
                        style={{ minHeight: '20rem' }}
                        onChange={(e) => onChangeInput(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-6" style={{ paddingLeft: 0 }}>
                    <div className="card-header">
                      <h3 className="card-title">
                        Output
                      </h3>
                    </div>
                    <div className="card-body">
                      <textarea
                        disabled
                        value={output}
                        onChange={(e) => onChangeOutput(e.target.value)}
                        className="form-control"
                        style={{ minHeight: '20rem' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}

export default Page;
